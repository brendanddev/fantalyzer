"""
main.py
Standalone poller for the ingest-sleeper service.
"""

import os
import sys
import time
import schedule
from shared.config import SLEEPER_LEAGUE_ID as LEAGUE_ID

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../"))

from shared.db import get_conn, init_schema, insert_raw_event
from shared.schemas import SourceType
from client import SleeperClient

client = SleeperClient(db_conn_factory=get_conn)


def poll_trending():
    trending = client.get_trending_players(type="add", lookback_hours=1, limit=50)
    if not trending:
        return
    for entry in trending:
        insert_raw_event({
            "source": SourceType.SLEEPER_TRENDING.value,
            "player_id": entry.get("player_id"),
            "payload": entry,
        })
    print(f"[ingest-sleeper] polled trending: {len(trending)} entries")


def poll_rosters():
    if not LEAGUE_ID:
        return
    rosters = client.get_rosters(LEAGUE_ID)
    if not rosters:
        return
    insert_raw_event({
        "source": SourceType.SLEEPER_ROSTER.value,
        "payload": {"rosters": rosters},
    })
    print(f"[ingest-sleeper] polled rosters: {len(rosters)} teams")


def poll_players():
    players = client.refresh_players()
    if not players:
        return
    insert_raw_event({
        "source": SourceType.SLEEPER_PLAYERS.value,
        "payload": {"player_count": len(players)},
    })
    print(f"[ingest-sleeper] refreshed player dump: {len(players)} players")


if __name__ == "__main__":
    init_schema()

    poll_players()
    poll_rosters()
    poll_trending()

    schedule.every(60).seconds.do(poll_trending)
    schedule.every(5).minutes.do(poll_rosters)
    schedule.every(1).days.do(poll_players)

    print("[ingest-sleeper] running...")
    while True:
        schedule.run_pending()
        time.sleep(1)
