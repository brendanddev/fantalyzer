"""
list_league_rosters.py
Run manually to see every team in a league and the players on each roster, 
resolved to human readable names.
"""

import argparse
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from shared.db import get_conn
from shared.config import SLEEPER_LEAGUES
from client import SleeperClient


def main():
    parser = argparse.ArgumentParser(description="List all teams and rosters in a Sleeper league.")
    parser.add_argument("league_name", help=f"League name from .env, one of: {list(SLEEPER_LEAGUES.keys())}")
    parser.add_argument("--position", help="Only show players at this position, e.g. RB")
    args = parser.parse_args()

    league_id = SLEEPER_LEAGUES.get(args.league_name)
    if not league_id:
        print(f"Unknown league '{args.league_name}'. Known leagues: {list(SLEEPER_LEAGUES.keys())}")
        return

    client = SleeperClient(db_conn_factory=get_conn)
    players = client.refresh_players() or {}
    rosters = client.get_rosters(league_id) or []

    if not rosters:
        print(f"No rosters found for league '{args.league_name}' ({league_id})")
        return

    for roster in rosters:
        owner_id = roster.get("owner_id")
        owner = client.get_user(owner_id) if owner_id else {}
        owner_name = owner.get("display_name", "Unknown") if owner else "Unknown"

        player_ids = roster.get("players") or []
        roster_players = []
        for pid in player_ids:
            p = players.get(pid, {})
            if args.position and p.get("position") != args.position.upper():
                continue
            roster_players.append(p)

        print(f"\n=== {owner_name} (roster_id {roster.get('roster_id')}) ===")
        if not roster_players:
            print("  (no matching players)")
            continue

        for p in sorted(roster_players, key=lambda p: (p.get("position") or "", p.get("full_name") or "")):
            print(
                f"  {p.get('position', '-'):<5} {p.get('full_name', 'Unknown'):<25} "
                f"{p.get('team') or '-':<5} depth={p.get('depth_chart_order')}"
            )


if __name__ == "__main__":
    main()
