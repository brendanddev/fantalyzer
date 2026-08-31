"""
main.py
Standalone poller for the ingest-sleeper service.
"""

import os
import sys
import time
import schedule
from shared.config import SLEEPER_LEAGUES

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../"))

from shared.db import (
    get_conn,
    init_schema,
    insert_raw_event,
    get_last_injury_status,
    upsert_injury_status,
)
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
    for league_name, league_id in SLEEPER_LEAGUES.items():
        rosters = client.get_rosters(league_id)
        if not rosters:
            continue
        insert_raw_event({
            "source": SourceType.SLEEPER_ROSTER.value,
            "league_id": league_id,
            "payload": {"league_name": league_name, "rosters": rosters},
        })
        print(f"[ingest-sleeper] polled rosters for {league_name}: {len(rosters)} teams")


def poll_players():
    players = client.refresh_players()
    if not players:
        return
    insert_raw_event({
        "source": SourceType.SLEEPER_PLAYERS.value,
        "payload": {"player_count": len(players)},
    })
    print(f"[ingest-sleeper] refreshed player dump: {len(players)} players")


def poll_injury_statuses():
    """
    Diff each injured player against their last known status, so we only
    emit an event when something actually moved.
    """
    players = client.get_injury_relevant_players()
    if not players:
        return

    with get_conn() as conn:
        changed = 0
        for entry in players:
            previous = get_last_injury_status(conn, entry["player_id"])
            previous_injury_status = previous[0] if previous else None
            previous_practice_participation = previous[1] if previous else None

            if (entry["injury_status"] != previous_injury_status
                    or entry["practice_participation"] != previous_practice_participation):
                insert_raw_event({
                    "source": SourceType.SLEEPER_INJURY_STATUS.value,
                    "player_id": entry["player_id"],
                    "player_name": entry["name"],
                    "team": entry["team"],
                    "payload": {
                        "position": entry["position"],
                        "injury_status": entry["injury_status"],
                        "practice_participation": entry["practice_participation"],
                        "previous_injury_status": previous_injury_status,
                        "previous_practice_participation": previous_practice_participation,
                    },
                }, conn=conn)
                changed += 1

            upsert_injury_status(
                conn,
                entry["player_id"],
                entry["injury_status"],
                entry["practice_participation"],
                entry["news_updated"],
            )

        print(f"[ingest-sleeper] checked {len(players)} injury-relevant players, {changed} changed")


if __name__ == "__main__":
    init_schema()

    poll_players()
    poll_rosters()
    poll_trending()
    poll_injury_statuses()

    schedule.every(60).seconds.do(poll_trending)
    schedule.every(5).minutes.do(poll_rosters)
    schedule.every(1).days.do(poll_players)
    schedule.every(15).minutes.do(poll_injury_statuses)

    print("[ingest-sleeper] running...")
    while True:
        schedule.run_pending()
        time.sleep(1)
