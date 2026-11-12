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
    reserve: string[] | null;
    settings: RosterSettings;
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

// Derived, not an API response. A Roster with its IDs resolved to Players.
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

// One teams depth chart. Keys are position codes (QB, RB, WR1, LCB),
// values are player IDs ordered starter first.
export type DepthChart = Record<string, string[]>;

// A stat or projection bag. Keys vary by player, position and week,
// so no fixed interface is possible.
export type Stats = Record<string, number>;

// One games stats or projections for one player. Same shape for both,
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
// The array is for iterating and runtime checks, the type is derived from it
// so the two cannot drift apart.
export const FANTASY_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"] as const;
export type FantasyPosition = typeof FANTASY_POSITIONS[number];

// Describes the settings type nested in each roster.
export interface RosterSettings {
    fpts: number;
    fpts_against: number;
    fpts_against_decimal: number;
    fpts_decimal: number;
    losses: number;
    ppts: number;
    ppts_decimal: number;
    ties: number;
    wins: number;
}

// Derived, not an API response. A singular entry in the leagues standings.
export interface StandingsEntry {
    rank: number;
    roster_id: number;
    owner_id: string;
    team_name: string;
    wins: number;
    losses: number;
    ties: number;
    points: number;
    points_against: number;
}

// A collection of entries making up the league standings.
export type LeagueStandings = StandingsEntry[];

// Describes one teams side of a weekly matchup. Two entries share a matchup_id.
// null means that roster isnt playing. 
export interface MatchupEntry {
    matchup_id: number | null;
    roster_id: number;
    points: number;
    players: string[];
    starters: string[];
    players_points: Record<string, number>;
}

// Derived. One team with its owners name, record, and players resolved from
// IDs into three groups.
export interface RosterView {
    roster_id: number;
    owner_id: string;
    team_name: string;
    wins: number;
    losses: number;
    ties: number;
    starters: Player[];
    bench: Player[];
    reserve: Player[];
}

// Derived. One player and its current trending count.
export interface TrendingView {
    player: Player;
    count: number;
}

// The player summary nested inside a weekly leader entry.
// No player_id, thats on the entry itself.
export interface EmbeddedPlayer {
    first_name: string;
    last_name: string;
    position: string;
    team: string;
    fantasy_positions: string[];
    injury_status: string | null;
}

// One players week from the bulk stats endpoint, ranked by pts_ppr.
export interface WeeklyLeaderEntry {
    player_id: string;
    week: number;
    season: string;
    team: string;
    opponent: string | null;
    game_id: string;
    date: string;
    stats: Stats;
    player: EmbeddedPlayer;
}

// Derived. An available players line from one week, ranked by PPR points.
// position_rank is 999 when Sleeper has them unranked.
export interface FreeAgentView {
    player_id: string;
    player_name: string;
    position: string;
    team: string;
    fantasy_points: number;
    position_rank: number;
}

// Derived. One week of a players season. What they were projected for, 
// what they actually scored, and how much they played.
export interface PlayerWeekView {
    week: number;
    opponent: string | null;
    actual_points: number | null;
    projected_points: number | null;
    snap_percentage: number | null;
}
