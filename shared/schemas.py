"""
schemas.py
Shared data contracts used across all services.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class SourceType(str, Enum):
    SLEEPER_TRENDING = "sleeper_trending"
    SLEEPER_ROSTER = "sleeper_roster"
    SLEEPER_PLAYERS = "sleeper_players"
    NFLVERSE_DEPTH_CHART = "nflverse_depth_chart"
    NEWS_RSS = "news_rss"


class RawEvent(BaseModel):
    """
    A single normalized fact pulled from any ingest service, before scoring.
    Every ingest service's only job is to produce these.
    """
    id: Optional[int] = None
    source: SourceType
    league_id: Optional[str] = None
    player_id: Optional[str] = None
    player_name: Optional[str] = None
    team: Optional[str] = None
    payload: dict = Field(default_factory=dict)
    fetched_at: datetime = Field(default_factory=datetime.utcnow)


class ScoredEvent(BaseModel):
    """
    Output of the scoring-engine: a RawEvent plus a confidence/urgency verdict.
    """
    raw_event_id: int
    player_id: Optional[str] = None
    player_name: Optional[str] = None
    confidence: float
    urgency: str
    reason: str
    scored_at: datetime = Field(default_factory=datetime.utcnow)


class HandcuffEntry(BaseModel):
    """
    A single curated backfield/handcuff relationship.
    """
    team: str
    position: str
    starter_player_id: str
    starter_name: str
    backup_player_id: str
    backup_name: str
    clean_succession: bool
    notes: Optional[str] = None
