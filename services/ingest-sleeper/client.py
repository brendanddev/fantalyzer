"""
client.py
Read only client for Sleeper's public API.
"""

import time
import requests
from datetime import datetime, timedelta

BASE_URL = "https://api.sleeper.app/v1"
DEFAULT_TTL_SECONDS = 600
PLAYERS_TTL_SECONDS = 60 * 60 * 24 


class SleeperClient:
    def __init__(self, db_conn_factory, base_url=BASE_URL):
        self.base_url = base_url
        self._get_conn = db_conn_factory

    def _get(self, endpoint: str, params=None):
        url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        try:
            response = requests.get(url, params=params, timeout=15)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"[ingest-sleeper] GET {url} failed: {e}")
            return None

    def _get_cached(self, endpoint: str, params=None, ttl=DEFAULT_TTL_SECONDS):
        import json
        import psycopg2.extras

        cache_key = f"{endpoint}?{json.dumps(params or {}, sort_keys=True)}"

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT payload, fetched_at FROM sleeper_cache WHERE cache_key = %s",
                    (cache_key,),
                )
                row = cur.fetchone()
                if row:
                    payload, fetched_at = row
                    if datetime.utcnow() - fetched_at < timedelta(seconds=ttl):
                        return payload

            result = self._get(endpoint, params=params)
            if result is not None:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO sleeper_cache (cache_key, payload, fetched_at)
                        VALUES (%s, %s, now())
                        ON CONFLICT (cache_key)
                        DO UPDATE SET payload = EXCLUDED.payload, fetched_at = now();
                        """,
                        (cache_key, psycopg2.extras.Json(result)),
                    )
            return result


    def get_user(self, identifier: str):
        return self._get_cached(f"user/{identifier}")

    def get_league(self, league_id: str):
        return self._get_cached(f"league/{league_id}")

    def get_rosters(self, league_id: str):
        return self._get_cached(f"league/{league_id}/rosters")

    def get_weekly_matchups(self, league_id: str, week: int):
        return self._get_cached(f"league/{league_id}/matchups/{week}")


    def refresh_players(self):
        """
        Full player dump, Sleeper says to cache this and pull once a day,
        not on every request.
        """
        return self._get_cached("players/nfl", ttl=PLAYERS_TTL_SECONDS)

    def get_depth_chart_entries(self, team: str = None, position: str = None):
        """
        Returns players with their depth_chart_order, optionally filtered
        by team/position, sorted so index 0 is the starter.
        """
        players = self.refresh_players() or {}
        entries = []
        for pid, p in players.items():
            if p.get("depth_chart_order") is None:
                continue
            if team and p.get("team") != team:
                continue
            if position and p.get("position") != position:
                continue
            entries.append({
                "player_id": pid,
                "name": p.get("full_name"),
                "team": p.get("team"),
                "position": p.get("position"),
                "depth_chart_order": p.get("depth_chart_order"),
                "depth_chart_position": p.get("depth_chart_position"),
            })
        return sorted(entries, key=lambda e: e["depth_chart_order"])


    def get_injury_relevant_players(self):
        """
        Only the players carrying an injury_status, the other ~12k healthy
        ones aren't worth iterating over every poll.
        """
        players = self.refresh_players() or {}
        entries = []
        for pid, p in players.items():
            if not p.get("injury_status"):
                continue
            entries.append({
                "player_id": pid,
                "name": p.get("full_name"),
                "team": p.get("team"),
                "position": p.get("position"),
                "injury_status": p.get("injury_status"),
                "practice_participation": p.get("practice_participation"),
                "news_updated": p.get("news_updated"),
            })
        return entries


    def get_trending_players(self, type="add", lookback_hours=24, limit=25):
        params = {"lookback_hours": lookback_hours, "limit": limit}
        return self._get_cached(f"players/nfl/trending/{type}", params=params, ttl=60)


    def get_free_agent_pool(self, league_id: str):
        """
        All rostered player_ids across the league, so callers can subtract
        from the full player list to get free agents.
        """
        rosters = self.get_rosters(league_id) or []
        rostered = set()
        for r in rosters:
            for pid in (r.get("players") or []):
                rostered.add(pid)
        return rostered
