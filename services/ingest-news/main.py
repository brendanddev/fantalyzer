"""
main.py
Standalone poller for the ingest-news service.
"""

import os
import sys
import json
import re
import time
import feedparser
import schedule

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../"))

from shared.db import (
    get_conn,
    init_schema,
    insert_raw_event,
    has_seen_news_item,
    mark_news_item_seen,
)
from shared.schemas import SourceType

ESPN_NFL_RSS_URL = "https://www.espn.com/espn/rss/nfl/news"
PLAYERS_CACHE_KEY = f"players/nfl?{json.dumps({}, sort_keys=True)}"

TEAM_NAMES = {
    "ARI": "Arizona Cardinals",
    "ATL": "Atlanta Falcons",
    "BAL": "Baltimore Ravens",
    "BUF": "Buffalo Bills",
    "CAR": "Carolina Panthers",
    "CHI": "Chicago Bears",
    "CIN": "Cincinnati Bengals",
    "CLE": "Cleveland Browns",
    "DAL": "Dallas Cowboys",
    "DEN": "Denver Broncos",
    "DET": "Detroit Lions",
    "GB": "Green Bay Packers",
    "HOU": "Houston Texans",
    "IND": "Indianapolis Colts",
    "JAX": "Jacksonville Jaguars",
    "KC": "Kansas City Chiefs",
    "LAC": "Los Angeles Chargers",
    "LAR": "Los Angeles Rams",
    "LV": "Las Vegas Raiders",
    "MIA": "Miami Dolphins",
    "MIN": "Minnesota Vikings",
    "NE": "New England Patriots",
    "NO": "New Orleans Saints",
    "NYG": "New York Giants",
    "NYJ": "New York Jets",
    "PHI": "Philadelphia Eagles",
    "PIT": "Pittsburgh Steelers",
    "SEA": "Seattle Seahawks",
    "SF": "San Francisco 49ers",
    "TB": "Tampa Bay Buccaneers",
    "TEN": "Tennessee Titans",
    "WAS": "Washington Commanders",
}

AMBIGUOUS_TEAM_ABBREVIATIONS = {"NO"}


def fetch_feed():
    """Entries from ESPN's public NFL feed, empty list if the fetch fails."""
    try:
        feed = feedparser.parse(ESPN_NFL_RSS_URL)
    except Exception as e:
        print(f"[ingest-news] fetching {ESPN_NFL_RSS_URL} failed: {e}")
        return []
    if feed.get("bozo") and not feed.entries:
        print(f"[ingest-news] fetching {ESPN_NFL_RSS_URL} failed: {feed.get('bozo_exception')}")
        return []
    return feed.entries


def load_known_players():
    """
    Player list built off the same cached Sleeper dump ingest-sleeper writes.
    Free agents/retired players (no team) are skipped, the team-signal rule
    could never match them anyway. Records with no full_name are skipped too:
    that is how Sleeper ships the 32 team-defense (DEF) pseudo-players, whose
    last_name is the team nickname ("Rams") rather than a person's surname.
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT payload FROM sleeper_cache WHERE cache_key = %s;",
                (PLAYERS_CACHE_KEY,),
            )
            row = cur.fetchone()

    if not row:
        print("[ingest-news] no cached Sleeper player dump yet, run `ingest-sleeper` first")
        return []

    players = []
    for player_id, p in (row[0] or {}).items():
        team = p.get("team")
        last_name = p.get("last_name")
        full_name = p.get("full_name")
        if not team or not last_name or not full_name:
            continue
        players.append({
            "player_id": player_id,
            "full_name": full_name,
            "last_name": last_name,
            "team": team,
            "position": p.get("position"),
        })
    return players


def _mentions(text: str, phrase: str) -> bool:
    """Whole-word match, so 'Allen' doesn't hit inside 'Allentown'."""
    return re.search(rf"\b{re.escape(phrase.lower())}\b", text) is not None


def _team_mentioned(text: str, team: str, team_name_map: dict) -> bool:
    """
    Headlines use either form inconsistently, so accept the abbreviation
    ("GB"), the full name ("Green Bay Packers") or the nickname ("Packers").
    """
    if team not in AMBIGUOUS_TEAM_ABBREVIATIONS and _mentions(text, team):
        return True
    full_name = team_name_map.get(team)
    if not full_name:
        return False
    return _mentions(text, full_name) or _mentions(text, full_name.split()[-1])


def match_player(text, known_players, team_name_map):
    """
    A match needs either the full first+last name on its own, which is already
    unambiguous, or the last name backed by a team mention. Last name alone is
    far too noisy (Johnson/Smith/Williams hit constantly), so a bare last-name
    hit is deliberately treated as no match.
    """
    text = (text or "").lower()
    for player in known_players:
        last_name = player.get("last_name")
        if not last_name or not player.get("full_name"):
            continue

        full_name = player.get("full_name")
        matched = bool(full_name) and _mentions(text, full_name)
        if not matched:
            matched = (
                _mentions(text, last_name)
                and _team_mentioned(text, player["team"], team_name_map)
            )
        if not matched:
            continue
        return {
            "player_id": player["player_id"],
            "full_name": full_name,
            "team": player["team"],
        }
    return None


def poll_news():
    entries = fetch_feed()
    if not entries:
        return

    known_players = load_known_players()

    new_count = 0
    matched_count = 0
    with get_conn() as conn:
        for entry in entries:
            link = entry.get("link")
            if not link or has_seen_news_item(conn, link):
                continue

            title = entry.get("title")
            summary = entry.get("summary")
            match = match_player(f"{title or ''} {summary or ''}", known_players, TEAM_NAMES)

            insert_raw_event({
                "source": SourceType.NEWS_RSS.value,
                "player_id": match["player_id"] if match else None,
                "player_name": match["full_name"] if match else None,
                "team": match["team"] if match else None,
                "payload": {
                    "title": title,
                    "link": link,
                    "summary": summary,
                    "published": entry.get("published"),
                },
            }, conn=conn)

            mark_news_item_seen(conn, link)
            new_count += 1
            if match:
                matched_count += 1

    print(f"[ingest-news] fetched {len(entries)} items, {new_count} new, {matched_count} matched to a player")


if __name__ == "__main__":
    init_schema()

    poll_news()

    schedule.every(5).minutes.do(poll_news)

    print("[ingest-news] running...")
    while True:
        schedule.run_pending()
        time.sleep(1)
