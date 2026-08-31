"""
db.py
Shared Postgres connection helper. Postgres doubles as both storage and the event bus.
"""

import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from shared.config import DATABASE_URL


@contextmanager
def get_conn():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# CREATE TABLE IF NOT EXISTS still races on Postgres's shared catalog when
# several services boot at once against a fresh database. The loser of the race
# surfaces the collision in one of several ways depending on how far it got:
# DuplicateTable, DuplicateObject on the table's implicit row type, or a
# UniqueViolation on a pg_ catalog index (pg_type_typname_nsp_index,
# pg_class_relname_nsp_index). All of them mean "someone else created it
# first", which is exactly the state we wanted.
SCHEMA_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS raw_events (
        id SERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        league_id TEXT,
        player_id TEXT,
        player_name TEXT,
        team TEXT,
        payload JSONB NOT NULL DEFAULT '{}',
        fetched_at TIMESTAMP NOT NULL DEFAULT now(),
        processed BOOLEAN NOT NULL DEFAULT false
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS scored_events (
        id SERIAL PRIMARY KEY,
        raw_event_id INTEGER REFERENCES raw_events(id),
        player_id TEXT,
        player_name TEXT,
        confidence REAL NOT NULL,
        urgency TEXT NOT NULL,
        reason TEXT NOT NULL,
        scored_at TIMESTAMP NOT NULL DEFAULT now(),
        dispatched BOOLEAN NOT NULL DEFAULT false
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS sleeper_cache (
        cache_key TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        fetched_at TIMESTAMP NOT NULL DEFAULT now()
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS player_injury_status (
        player_id TEXT PRIMARY KEY,
        injury_status TEXT,
        practice_participation TEXT,
        news_updated BIGINT,
        updated_at TIMESTAMP NOT NULL DEFAULT now()
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS seen_news_items (
        item_link TEXT PRIMARY KEY,
        seen_at TIMESTAMP NOT NULL DEFAULT now()
    );
    """,
]


def _lost_create_race(exc) -> bool:
    """
    True only for the catalog-level collisions two concurrent CREATE TABLEs
    produce. A UniqueViolation from anywhere but a pg_ catalog index is a real
    error and must not be swallowed.
    """
    if isinstance(exc, (psycopg2.errors.DuplicateTable, psycopg2.errors.DuplicateObject)):
        return True
    if isinstance(exc, psycopg2.errors.UniqueViolation):
        return (exc.diag.constraint_name or "").startswith("pg_")
    return False


def init_schema():
    """Run once at startup for each service (idempotent, and safe to race)."""
    with get_conn() as conn:
        for statement in SCHEMA_STATEMENTS:
            # Committed one at a time: a rollback has to undo only the
            # statement that lost, not the tables already created above it.
            try:
                with conn.cursor() as cur:
                    cur.execute(statement)
                conn.commit()
            except psycopg2.Error as e:
                if not _lost_create_race(e):
                    raise
                conn.rollback()
                print(f"[db] table already created by another service, continuing: {type(e).__name__}")


def _insert_raw_event(conn, event: dict) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO raw_events (source, league_id, player_id, player_name, team, payload)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id;
            """,
            (
                event["source"],
                event.get("league_id"),
                event.get("player_id"),
                event.get("player_name"),
                event.get("team"),
                psycopg2.extras.Json(event.get("payload", {})),
            ),
        )
        return cur.fetchone()[0]


def insert_raw_event(event: dict, conn=None) -> int:
    """
    Pass conn to write inside a caller's existing transaction (they own the
    commit); omit it to open, commit and close a connection of our own.
    """
    if conn is not None:
        return _insert_raw_event(conn, event)
    with get_conn() as own_conn:
        return _insert_raw_event(own_conn, event)


def get_last_injury_status(conn, player_id: str):
    """
    Last known injury state for a player, or None if we've never seen them.
    Returns (injury_status, practice_participation, news_updated).
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT injury_status, practice_participation, news_updated
            FROM player_injury_status
            WHERE player_id = %s;
            """,
            (player_id,),
        )
        row = cur.fetchone()
        return tuple(row) if row else None


def upsert_injury_status(conn, player_id: str, injury_status, practice_participation, news_updated):
    """Record the current injury state as the new last known baseline."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO player_injury_status (player_id, injury_status, practice_participation, news_updated)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (player_id)
            DO UPDATE SET
                injury_status = EXCLUDED.injury_status,
                practice_participation = EXCLUDED.practice_participation,
                news_updated = EXCLUDED.news_updated,
                updated_at = now();
            """,
            (player_id, injury_status, practice_participation, news_updated),
        )


def has_seen_news_item(conn, link: str) -> bool:
    """True if this news item's link has already been ingested."""
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM seen_news_items WHERE item_link = %s;", (link,))
        return cur.fetchone() is not None


def mark_news_item_seen(conn, link: str):
    """Record a news item as ingested so later polls skip it."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO seen_news_items (item_link)
            VALUES (%s)
            ON CONFLICT (item_link) DO NOTHING;
            """,
            (link,),
        )
