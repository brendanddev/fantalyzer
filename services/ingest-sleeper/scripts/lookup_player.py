"""
lookup_player.py
Utility for development, not part of the main poll loop.
"""

import argparse
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from shared.db import get_conn
from client import SleeperClient


def main():
    parser = argparse.ArgumentParser(description="Look up a Sleeper player_id by name.")
    parser.add_argument("name", help="Full or partial player name, case-insensitive")
    parser.add_argument("--team", help="Filter by team abbreviation, e.g. GB")
    parser.add_argument("--position", help="Filter by position, e.g. RB")
    args = parser.parse_args()

    client = SleeperClient(db_conn_factory=get_conn)
    players = client.refresh_players() or {}

    query = args.name.lower()
    matches = []
    for pid, p in players.items():
        full_name = (p.get("full_name") or "").lower()
        if query not in full_name:
            continue
        if args.team and p.get("team") != args.team.upper():
            continue
        if args.position and p.get("position") != args.position.upper():
            continue
        matches.append((pid, p))

    if not matches:
        print(f"No players found matching '{args.name}'")
        return

    print(f"{'player_id':<10} {'name':<25} {'team':<6} {'pos':<5} {'depth_chart_order'}")
    for pid, p in matches:
        print(
            f"{pid:<10} {p.get('full_name', ''):<25} "
            f"{p.get('team') or '-':<6} {p.get('position') or '-':<5} "
            f"{p.get('depth_chart_order')}"
        )


if __name__ == "__main__":
    main()
