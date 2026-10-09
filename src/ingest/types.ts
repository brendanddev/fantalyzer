// Current NFL week and season.
export interface NflState {
    week: number;
    display_week: number;
    leg: number;
    season: string;
    season_type: string;
}

// League settings and metadata.
export interface League {
    league_id: string;
    name: string;
    status: string;
    season: string;
    sport: string;
    total_rosters: number;
}

// One teams roster.
export interface Roster {
    league_id: string;
    owner_id: string;
    roster_id: number;
    players: string[];
    starters: string[];
}

// A league member.
export interface User {
    user_id: string;
    username: string;
    display_name: string;
}

// One player from the full dump.
export interface Player {
    player_id: string;
    full_name: string;
    team: string;
    position: string | null;
    fantasy_positions: string[] | null;
    depth_chart_order: number;
    injury_status: string | null;
    status: string | null;
}

// Derived, not an API response: a Roster with its IDs resolved to Players.
export interface RosterWithPlayers {
    roster_id: number;
    owner_id: string;
    players: (Player | undefined)[];
}

// One row from the trending adds/drops list. No name or position, just the ID.
export interface TrendingEntry {
    player_id: string;
    count: number;
}

// One teams depth chart. Keys are position codes (QB, RB, WR1, LCB);
// values are player IDs ordered starter first.
export type DepthChart = Record<string, string[]>;

// A stat or projection bag. Keys vary by player, position and week,
// so no fixed interface is possible.
export type Stats = Record<string, number>;

// One games stats or projections for one player. Same shape for both;
// category says which.
export interface PlayerWeekEntry {
    player_id: string;
    week: number | null;
    season: string;
    team: string;
    opponent: string | null;
    game_id: string;
    date: string;
    category: "stat" | "proj";
    stats: Stats;
}

// Returned when grouping=week. Keys are week numbers; null = bye or missed game.
export type WeeklyEntries = Record<string, PlayerWeekEntry | null>;

// Roster slots Sleeper reports in fantasy_positions.
export type FantasyPosition = "QB" | "RB" | "WR" | "TE" | "K" | "DEF";
