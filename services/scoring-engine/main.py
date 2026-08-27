"""
main.py
Polls unprocessed sleeper_trending events, checks each trending player against 
handcuff-service's reverse lookup.
"""

import os
import sys
import time
import requests
import schedule

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../"))

from shared.db import get_conn, init_schema

HANDCUFF_SERVICE_URL = os.environ.get("HANDCUFF_SERVICE_URL", "http://handcuff-service:8000")
MIN_ADD_COUNT = 5


def get_unprocessed_trending_events(conn, limit=100):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, player_id, payload
            FROM raw_events
            WHERE source = 'sleeper_trending' AND processed = false
            ORDER BY fetched_at ASC
            LIMIT %s;
            """,
            (limit,),
        )
        return cur.fetchall()


def mark_processed(conn, event_id):
    with conn.cursor() as cur:
        cur.execute("UPDATE raw_events SET processed = true WHERE id = %s;", (event_id,))


def get_handcuff_for_backup(player_id):
    """Returns the handcuff entry if this player is a curated backup, else None."""
    try:
        resp = requests.get(f"{HANDCUFF_SERVICE_URL}/handcuffs/by-backup/{player_id}", timeout=5)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        matches = resp.json()
        return matches[0] if matches else None
    except requests.exceptions.RequestException as e:
        print(f"[scoring-engine] handcuff-service lookup failed for {player_id}: {e}")
        return None


def score_event(handcuff_entry: dict, add_count: int) -> dict:
    """
    v1 confidence model: base confidence from clean_succession, adjusted by
    trending magnitude. Deliberately simple -- refine once real news/injury
    signals exist to cross-reference against.
    """
    base_confidence = 0.7 if handcuff_entry["clean_succession"] else 0.4

    # Trending magnitude nudges confidence up, capped so can't alone push messy 
    # committee situation into "fire" territory.
    magnitude_boost = min(add_count / 100, 0.2)
    confidence = min(base_confidence + magnitude_boost, 0.95)

    urgency = "fire" if confidence >= 0.6 else "log_only"

    caveat = "" if handcuff_entry["clean_succession"] else " (committee backfield -- treat with caution)"
    reason = (
        f"{handcuff_entry['backup_name']} trending ({add_count} adds) as curated backup "
        f"for {handcuff_entry['starter_name']}{caveat}"
    )

    return {"confidence": round(confidence, 2), "urgency": urgency, "reason": reason}


def insert_scored_event(conn, raw_event_id, player_id, player_name, scored: dict):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO scored_events (raw_event_id, player_id, player_name, confidence, urgency, reason)
            VALUES (%s, %s, %s, %s, %s, %s);
            """,
            (raw_event_id, player_id, player_name, scored["confidence"], scored["urgency"], scored["reason"]),
        )


def run_scoring_pass():
    with get_conn() as conn:
        events = get_unprocessed_trending_events(conn)
        if not events:
            return

        scored_count = 0
        for event_id, player_id, payload in events:
            add_count = payload.get("count", 0) if isinstance(payload, dict) else 0

            if not player_id or add_count < MIN_ADD_COUNT:
                mark_processed(conn, event_id)
                continue

            handcuff_entry = get_handcuff_for_backup(player_id)
            if handcuff_entry is None:
                mark_processed(conn, event_id)
                continue

            scored = score_event(handcuff_entry, add_count)
            insert_scored_event(conn, event_id, player_id, handcuff_entry["backup_name"], scored)
            mark_processed(conn, event_id)
            scored_count += 1

        print(f"[scoring-engine] processed {len(events)} events, scored {scored_count}")


if __name__ == "__main__":
    init_schema()
    print("[scoring-engine] running...")

    schedule.every(30).seconds.do(run_scoring_pass)
    run_scoring_pass()

    while True:
        schedule.run_pending()
        time.sleep(1)
