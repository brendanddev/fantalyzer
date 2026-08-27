"""
main.py
Polls scored_events for urgency='fire' rows that havent been dispatched yet, formats a message, 
pushes it to ntfy.sh, and marks it dispatched so it never fires twice.
"""

import os
import sys
import time
import requests
import schedule

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../"))

from shared.db import get_conn, init_schema

NTFY_TOPIC = os.environ.get("NTFY_TOPIC")
NTFY_URL = f"https://ntfy.sh/{NTFY_TOPIC}" if NTFY_TOPIC else None


def get_undispatched_fire_events(conn, limit=20):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, player_name, confidence, reason
            FROM scored_events
            WHERE urgency = 'fire' AND dispatched = false
            ORDER BY scored_at ASC
            LIMIT %s;
            """,
            (limit,),
        )
        return cur.fetchall()


def mark_dispatched(conn, scored_event_id):
    with conn.cursor() as cur:
        cur.execute("UPDATE scored_events SET dispatched = true WHERE id = %s;", (scored_event_id,))


def send_ntfy_alert(player_name, confidence, reason):
    if not NTFY_URL:
        print("[alert-dispatcher] NTFY_TOPIC not set, skipping send (would have sent):")
        print(f"  {player_name} ({confidence}): {reason}")
        return False

    try:
        resp = requests.post(
            NTFY_URL,
            data=reason.encode("utf-8"),
            headers={
                "Title": f"Fantalyzer: {player_name}".encode("utf-8"),
                "Priority": "high",
                "Tags": "rotating_light",
            },
            timeout=10,
        )
        resp.raise_for_status()
        return True
    except requests.exceptions.RequestException as e:
        print(f"[alert-dispatcher] failed to send ntfy alert: {e}")
        return False


def run_dispatch_pass():
    with get_conn() as conn:
        events = get_undispatched_fire_events(conn)
        if not events:
            return

        sent_count = 0
        for event_id, player_name, confidence, reason in events:
            success = send_ntfy_alert(player_name, confidence, reason)
            if success:
                mark_dispatched(conn, event_id)
                sent_count += 1

        print(f"[alert-dispatcher] dispatched {sent_count}/{len(events)} alerts")


if __name__ == "__main__":
    init_schema()

    if not NTFY_TOPIC:
        print("[alert-dispatcher] WARNING: NTFY_TOPIC not set in .env, alerts will be logged, not sent")

    print("[alert-dispatcher] running...")

    schedule.every(30).seconds.do(run_dispatch_pass)
    run_dispatch_pass()

    while True:
        schedule.run_pending()
        time.sleep(1)
