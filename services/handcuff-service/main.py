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
    Returns 404 if no curated entry exists yet.
    """
    entries = _load()
    matches = [e for e in entries if e["starter_player_id"] == starter_player_id]
    if not matches:
        raise HTTPException(status_code=404, detail="No curated handcuff for this player")
    return matches


@app.get("/handcuffs/by-backup/{backup_player_id}")
def get_handcuff_for_backup(backup_player_id: str):
    """
    The reverse lookup: 'is this player anyone's curated backup.'
    Used by scoring-engine to check whether a trending player is trending
    because their starter might be out, vs. just generic noise.
    Returns 404 if this player isn't curated as anyone's backup yet.
    """
    entries = _load()
    matches = [e for e in entries if e["backup_player_id"] == backup_player_id]
    if not matches:
        raise HTTPException(status_code=404, detail="This player is not a curated backup for anyone")
    return matches
 

@app.post("/handcuffs")
def upsert_handcuff(entry: HandcuffEntry):
    """
    Add or update a handcuff entry, keyed on (starter_player_id, backup_player_id).
    Lets you curate via API calls instead of hand-editing JSON forever.
    """
    entries = _load()
    key = (entry.starter_player_id, entry.backup_player_id)
    entries = [
        e for e in entries
        if (e["starter_player_id"], e["backup_player_id"]) != key
    ]
    entries.append(entry.model_dump())
    _save(entries)
    return entry


@app.delete("/handcuffs/{starter_player_id}/{backup_player_id}")
def delete_handcuff(starter_player_id: str, backup_player_id: str):
    """
    Remove a specific handcuff entry by its (starter, backup) key.
    Use this to retire stale/placeholder entries instead of hand-editing JSON.
    """
    entries = _load()
    key = (starter_player_id, backup_player_id)
    remaining = [
        e for e in entries
        if (e["starter_player_id"], e["backup_player_id"]) != key
    ]
    if len(remaining) == len(entries):
        raise HTTPException(status_code=404, detail="No matching handcuff entry found")
    _save(remaining)
    return {"deleted": True, "starter_player_id": starter_player_id, "backup_player_id": backup_player_id}

 
@app.get("/health")
def health():
    return {"status": "ok", "entry_count": len(_load())}
