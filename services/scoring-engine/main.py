"""
main.py
Polls unprocessed raw_events from every signal source that is scored, 
resolves each one to a curated handcuff entry via handcuff-service, 
and scores the BACKUP that the event implies is worth picking up
"""

import os
import re
import sys
import time
import requests
import schedule

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../"))

from shared.db import get_conn, init_schema

HANDCUFF_SERVICE_URL = os.environ.get("HANDCUFF_SERVICE_URL", "http://handcuff-service:8000")
MIN_ADD_COUNT = 5

FIRE_THRESHOLD = 0.6
MAX_CONFIDENCE = 0.95
COMMITTEE_PENALTY = 0.3

SOURCE_TRENDING = "sleeper_trending"
SOURCE_INJURY_STATUS = "sleeper_injury_status"
SOURCE_NEWS = "news_rss"

TRENDING_BASE_CONFIDENCE = 0.7

INJURY_STATUS_CONFIDENCE = {
    "out": 0.9,
    "doubtful": 0.9,
    "ir": 0.9,
    "na": 0.9,
    "questionable": 0.5,
}

NEW_OCCURRENCE_ONLY_STATUSES = {"na"}

SOURCE_PRIORITY = {
    SOURCE_INJURY_STATUS: 0,
    SOURCE_NEWS: 1,
    SOURCE_TRENDING: 2,
}

NEWS_BASE_CONFIDENCE = 0.65
NEWS_OFF_TOPIC_CONFIDENCE = 0.45

NEWS_INJURY_KEYWORDS = (
    r"injur\w*", r"ruled out", r"out for", r"out with", r"out indefinitely",
    r"inactive", r"doubtful", r"questionable", r"ir", r"pup", r"exempt",
    r"suspen\w*", r"sidelined", r"miss\w*", r"dnp",
    r"surger\w*", r"mri", r"sprain\w*", r"strain\w*", r"fracture\w*",
    r"tear\w*", r"torn",
    r"hamstring", r"groin", r"knee", r"ankle", r"acl", r"achilles",
    r"concussion", r"shoulder", r"calf", r"quad", r"hip", r"oblique", r"ribs",
)
NEWS_INJURY_PATTERN = re.compile(r"\b(?:" + "|".join(NEWS_INJURY_KEYWORDS) + r")\b", re.IGNORECASE)


def get_unprocessed_events(conn, sources, limit=100):
    """
    Every unprocessed event across the sources we score, oldest first. One
    chronological queue rather than one queue per source: when several sources
    fire for the same backup in a single pass, the winner should be decided by
    the signals themselves, not by the order the sources happen to be listed in.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, source, player_id, payload
            FROM raw_events
            WHERE source = ANY(%s) AND processed = false
            ORDER BY fetched_at ASC
            LIMIT %s;
            """,
            (list(sources), limit),
        )
        return cur.fetchall()


def mark_processed(conn, event_id):
    with conn.cursor() as cur:
        cur.execute("UPDATE raw_events SET processed = true WHERE id = %s;", (event_id,))
 
 
def get_handcuff_for_backup(player_id):
    """Returns the handcuff entry if this player is a curated backup, else None."""
    try:
        resp = requests.get(f"{HANDCUFF_SERVICE_URL}/handcuffs/by-backup/{player_id}", timeout=5)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        matches = resp.json()
        return matches[0] if matches else None
    except requests.exceptions.RequestException as e:
        print(f"[scoring-engine] handcuff-service lookup failed for {player_id}: {e}")
        return None
 
 
def get_handcuff_for_starter(player_id):
    """Returns the handcuff entry if this player is a curated starter, else None."""
    try:
        resp = requests.get(f"{HANDCUFF_SERVICE_URL}/handcuffs/by-starter/{player_id}", timeout=5)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        matches = resp.json()
        return matches[0] if matches else None
    except requests.exceptions.RequestException as e:
        print(f"[scoring-engine] handcuff-service lookup failed for {player_id}: {e}")
        return None
 
 
def score_event(handcuff_entry: dict, base_confidence: float, reason: str) -> dict:
    """
    Shared tail of every scoring path: dock the committee-backfield penalty,
    clamp, apply the >= 0.6 "fire" threshold, and attach the caveat when the
    curated entry is not a clean succession. Callers supply the base confidence
    and the source-specific reason.
    """
    clean_succession = handcuff_entry["clean_succession"]

    confidence = base_confidence - (0.0 if clean_succession else COMMITTEE_PENALTY)
    confidence = round(max(0.0, min(confidence, MAX_CONFIDENCE)), 2)

    urgency = "fire" if confidence >= FIRE_THRESHOLD else "log_only"
    caveat = "" if clean_succession else " (committee backfield -- treat with caution)"

    return {"confidence": confidence, "urgency": urgency, "reason": reason + caveat}
 
 
def score_trending_event(handcuff_entry: dict, payload: dict) -> dict:
    """
    v1 confidence model: a flat base adjusted by trending magnitude, with the
    committee penalty applied by score_event. The trending player IS the backup
    here, so this path reads as "someone's curated backup is being added".
    """
    add_count = payload.get("count", 0)

    magnitude_boost = min(add_count / 100, 0.2)

    reason = (
        f"{handcuff_entry['backup_name']} trending ({add_count} adds) as curated backup "
        f"for {handcuff_entry['starter_name']}"
    )

    return score_event(handcuff_entry, TRENDING_BASE_CONFIDENCE + magnitude_boost, reason)
 
 
def score_injury_status_event(handcuff_entry: dict, payload: dict):
    """
    The event fires on any change to a starter's injury_status or practice
    participation, including recoveries ("Out" -> None) and statuses that say
    nothing about availability. Those are not actionable, so an unrecognized
    status returns None and the caller just marks the row processed.

    "NA" is not a medical designation: it is how Sleeper represents a
    suspension, an exempt-list placement, or another roster-limiting event.
    A starter who unexpectedly cannot play is the same practical signal for
    fantasy purposes whether the cause is medical or disciplinary, so entering
    it is scored like Out/Doubtful/IR. Only ENTERING it counts --
    NEW_OCCURRENCE_ONLY_STATUSES drops the case where the status sits at "NA"
    while practice participation moves underneath it. Leaving "NA" needs no
    guard: scoring keys off the NEW status, so "NA" -> healthy scores nothing
    ("" is unmapped) and "NA" -> "Questionable" scores as Questionable. That a
    returning starter deprives the backup of value is a different event that
    deserves its own path, not this one.
    """
    status = (payload.get("injury_status") or "").strip()
    base_confidence = INJURY_STATUS_CONFIDENCE.get(status.lower())
    if base_confidence is None:
        return None

    previous_status = (payload.get("previous_injury_status") or "").strip()
    practice = (payload.get("practice_participation") or "").strip()
    previous_practice = (payload.get("previous_practice_participation") or "").strip()

    status_changed = status.lower() != previous_status.lower()
    if not status_changed and status.lower() in NEW_OCCURRENCE_ONLY_STATUSES:
        return None

    changes = []
    if status_changed:
        changes.append(f"injury status {previous_status or 'none'} -> {status}")
    if practice.lower() != previous_practice.lower():
        changes.append(f"practice {previous_practice or 'none'} -> {practice or 'none'}")
    if not changes:
        changes.append(f"injury status {status}")

    reason = (
        f"{handcuff_entry['starter_name']} {', '.join(changes)} -- "
        f"{handcuff_entry['backup_name']} is the curated backup"
    )

    return score_event(handcuff_entry, base_confidence, reason)
 
 
def score_news_event(handcuff_entry: dict, payload: dict) -> dict:
    """
    A matched ESPN story about a curated starter, scored on the backup. The
    matcher in ingest-news only knows the story mentions the player, not why,
    so a story with no availability language (a recap, a trade rumor) is scored
    below the fire threshold instead of pushing an alert.
    """
    title = (payload.get("title") or "").strip()
    summary = (payload.get("summary") or "").strip()

    injury_related = bool(NEWS_INJURY_PATTERN.search(f"{title} {summary}"))
    base_confidence = NEWS_BASE_CONFIDENCE if injury_related else NEWS_OFF_TOPIC_CONFIDENCE

    headline = f'"{title}"' if title else "(untitled story)"
    note = "" if injury_related else " [no injury/status language in story]"

    reason = (
        f"News on {handcuff_entry['starter_name']}: {headline} -- "
        f"{handcuff_entry['backup_name']} is the curated backup{note}"
    )

    return score_event(handcuff_entry, base_confidence, reason)

SOURCE_HANDLERS = {
    SOURCE_TRENDING: {
        "label": "trending",
        "lookup": get_handcuff_for_backup,
        "score": score_trending_event,
    },
    SOURCE_INJURY_STATUS: {
        "label": "injury_status",
        "lookup": get_handcuff_for_starter,
        "score": score_injury_status_event,
    },
    SOURCE_NEWS: {
        "label": "news",
        "lookup": get_handcuff_for_starter,
        "score": score_news_event,
    },
}
 
 
def passes_source_prefilter(source, payload) -> bool:
    """
    Cheap source-specific gate applied before the handcuff-service call.
    MIN_ADD_COUNT is a trending-only notion, the other two sources carry no
    equivalent magnitude signal to threshold on.
    """
    if source == SOURCE_TRENDING:
        return payload.get("count", 0) >= MIN_ADD_COUNT
    return True
 
 
def insert_scored_event(conn, raw_event_id, player_id, player_name, scored: dict):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO scored_events (raw_event_id, player_id, player_name, confidence, urgency, reason)
            VALUES (%s, %s, %s, %s, %s, %s);
            """,
            (raw_event_id, player_id, player_name, scored["confidence"], scored["urgency"], scored["reason"]),
        )
 
 
def has_recent_fire_alert(conn, player_id, cooldown_hours=6):
    """
    True if we've already fired an alert for this player within the cooldown
    window. Prevents re-alerting every poll while a player stays trending,
    the situation is the same, we already told the user once.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1 FROM scored_events
            WHERE player_id = %s
              AND urgency = 'fire'
              AND scored_at > now() - (%s || ' hours')::interval
            LIMIT 1;
            """,
            (player_id, cooldown_hours),
        )
        return cur.fetchone() is not None
 
 
def build_candidate(source, event_id, player_id, payload):
    """
    Resolve one raw event to a scored candidate, or None when there is nothing
    to score (no player, below a source prefilter, no curated handcuff, or a
    payload the source's scorer had no verdict on). Does no writes, so the
    whole pass can be scored before deciding which candidates survive.
    """
    handler = SOURCE_HANDLERS[source]
    payload = payload if isinstance(payload, dict) else {}

    if not player_id or not passes_source_prefilter(source, payload):
        return None

    handcuff_entry = handler["lookup"](player_id)
    if handcuff_entry is None:
        return None

    scored = handler["score"](handcuff_entry, payload)
    if scored is None:
        return None

    return {
        "event_id": event_id,
        "source": source,
        "backup_player_id": handcuff_entry["backup_player_id"],
        "backup_name": handcuff_entry["backup_name"],
        "scored": scored,
    }
 
 
def candidate_rank(candidate):
    """
    Ordering key for choosing between two fire candidates on the same backup,
    lowest wins. Confidence is the first component and therefore always
    decisive: SOURCE_PRIORITY is only ever consulted when two candidates carry
    exactly the same confidence, and can never overturn a confidence gap.

    On an exact tie the more informative source wins. injury_status and news
    reason strings say WHY the backup matters -- the status change itself, or
    the headline -- while trending only reports an adds count and explains
    nothing. Confidence is rounded to two places in score_event, so "exactly
    the same" is well defined here rather than a float coincidence.
    """
    return (
        -candidate["scored"]["confidence"],
        SOURCE_PRIORITY.get(candidate["source"], len(SOURCE_PRIORITY)),
    )
 
 
def drop_duplicate_fires(candidates):
    """
    Within one pass, several sources can independently fire for the same backup
    off the same real-world situation (a status change, and the story written
    about that change). They are not independent evidence, so only the best one
    earns a row; the rest are dropped rather than written as weaker duplicates.
    "Best" is candidate_rank: highest confidence, then source priority, then
    the earliest event, since `candidates` is already in fetched_at order.

    log_only candidates are left alone -- they raise no alert, and keeping them
    preserves the audit trail of everything the pass actually saw.
    """
    best = {}
    for index, candidate in enumerate(candidates):
        if candidate["scored"]["urgency"] != "fire":
            continue
        backup_player_id = candidate["backup_player_id"]
        incumbent = best.get(backup_player_id)
        if incumbent is None or candidate_rank(candidate) < candidate_rank(candidates[incumbent]):
            best[backup_player_id] = index

    winners = set(best.values())

    kept, superseded = [], []
    for index, candidate in enumerate(candidates):
        if candidate["scored"]["urgency"] != "fire" or index in winners:
            kept.append(candidate)
        else:
            superseded.append(candidate)
    return kept, superseded
 
 
def run_scoring_pass():
    with get_conn() as conn:
        events = get_unprocessed_events(conn, list(SOURCE_HANDLERS))
        if not events:
            return

        stats = {source: {"processed": 0, "scored": 0} for source in SOURCE_HANDLERS}
        candidates = []

        for event_id, source, player_id, payload in events:
            stats[source]["processed"] += 1
            candidate = build_candidate(source, event_id, player_id, payload)
            if candidate is None:
                mark_processed(conn, event_id)
                continue
            candidates.append(candidate)

        kept, superseded = drop_duplicate_fires(candidates)

        for candidate in superseded:
            mark_processed(conn, candidate["event_id"])

        for candidate in kept:
            scored = candidate["scored"]
            if scored["urgency"] == "fire" and has_recent_fire_alert(conn, candidate["backup_player_id"]):
                scored["urgency"] = "log_only"
                scored["reason"] += " [cooldown: already alerted recently]"

            insert_scored_event(
                conn,
                candidate["event_id"],
                candidate["backup_player_id"],
                candidate["backup_name"],
                scored,
            )
            mark_processed(conn, candidate["event_id"])
            stats[candidate["source"]]["scored"] += 1

        summary = " | ".join(
            f"{handler['label']}: processed {stats[source]['processed']} scored {stats[source]['scored']}"
            for source, handler in SOURCE_HANDLERS.items()
        )
        if superseded:
            summary += f" | superseded {len(superseded)} duplicate fire(s)"
        print(f"[scoring-engine] {summary}")
 
 
if __name__ == "__main__":
    init_schema()
    print("[scoring-engine] running...")
 
    schedule.every(30).seconds.do(run_scoring_pass)
    run_scoring_pass()
 
    while True:
        schedule.run_pending()
        time.sleep(1)
