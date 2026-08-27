"""
main.py
Owns the curated backfield/handcuff map for the handcuff-service.
"""

import json
import os
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "handcuffs.json")
app = FastAPI(title="handcuff-service")


class HandcuffEntry(BaseModel):
    team: str
    position: str
    starter_player_id: str
    starter_name: str
    backup_player_id: str
    backup_name: str
    clean_succession: bool
    notes: Optional[str] = None


def _load() -> list[dict]:
    if not os.path.exists(DATA_PATH):
        return []
    with open(DATA_PATH, "r") as f:
        return json.load(f)


def _save(entries: list[dict]):
    with open(DATA_PATH, "w") as f:
        json.dump(entries, f, indent=2)


@app.get("/handcuffs")
def list_handcuffs(team: Optional[str] = None, position: Optional[str] = None):
    """List all curated handcuff entries, optionally filtered by team/position."""
    entries = _load()
    if team:
        entries = [e for e in entries if e["team"].upper() == team.upper()]
    if position:
        entries = [e for e in entries if e["position"].upper() == position.upper()]
    return entries


@app.get("/handcuffs/by-starter/{starter_player_id}")
def get_handcuff_for_starter(starter_player_id: str):
    """
    The core lookup: 'if this starter is out, who benefits.'
    Returns 404 if no curated entry exists yet, callers should treat
    that as 'no known handcuff,' not as an empty/safe answer.
    """
    entries = _load()
    matches = [e for e in entries if e["starter_player_id"] == starter_player_id]
    if not matches:
        raise HTTPException(status_code=404, detail="No curated handcuff for this player")
    return matches


@app.post("/handcuffs")
def upsert_handcuff(entry: HandcuffEntry):
    """Add or update a handcuff entry, keyed on (starter_player_id, backup_player_id)."""
    entries = _load()
    key = (entry.starter_player_id, entry.backup_player_id)
    entries = [
        e for e in entries
        if (e["starter_player_id"], e["backup_player_id"]) != key
    ]
    entries.append(entry.model_dump())
    _save(entries)
    return entry


@app.get("/health")
def health():
    return {"status": "ok", "entry_count": len(_load())}
