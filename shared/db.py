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


def init_schema():
    """Run once at startup for each service (idempotent)."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
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
            """)
            cur.execute("""
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
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS sleeper_cache (
                    cache_key TEXT PRIMARY KEY,
                    payload JSONB NOT NULL,
                    fetched_at TIMESTAMP NOT NULL DEFAULT now()
                );
            """)


def insert_raw_event(event: dict) -> int:
    with get_conn() as conn:
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
