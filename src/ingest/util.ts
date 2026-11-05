import type { Roster } from "./types.js";

// Shared helpers for working with Sleeper data.

// Sleeper splits points into whole and hundredths parts (595 + 68 = 595.68).
export function combinePoints(whole: number, decimal: number): number {
    return decimal / 100 + whole;
}

// Sort comparator: most wins first, points for as the tiebreaker.
export function compareByStandings(a: Roster, b: Roster): number {
    return (b.settings.wins - a.settings.wins) ||
        (combinePoints(b.settings.fpts, b.settings.fpts_decimal) -
            combinePoints(a.settings.fpts, a.settings.fpts_decimal));
}

// Returns all bench player IDs for a single roster.
// Bench is everyone on the roster who isnt starting or isnt on IR.
export function getBenchIds(roster: Roster): string[] {
    const excludedIds: string[] = [];

    for (const id of roster.starters) {
        excludedIds.push(id);
    }

    if (roster.reserve) {
        for (const id of roster.reserve) {
            excludedIds.push(id);
        }
    }
    return roster.players.filter(id => !excludedIds.includes(id));
}
