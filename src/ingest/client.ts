import { pool } from "../db/db.js";

export interface League {
    league_id: string;
    name: string;
    status: string;
}

export interface UserRecord {
    user_id: string;
    display_name: string;
    username: string;
}

export interface Roster {
    roster_id: string;
    league_id: string;
    owner_id: string;
    players: string[];
    injury_reserve: string[] | null;
}

export interface TrendingEntry {
    player_id: string;
    count: number;
}

interface PlayerRecord {
    player_id: string;
    full_name: string | null;
    team: string | null;
    position: string | null;
    depth_chart_order: number | null;
    injury_status: string | null;
}

export class SleeperClient {
    private static readonly PLAYERS_TTL_HOURS = 24;
    private baseUrl: string;

    constructor(baseUrl: string = "https://api.sleeper.app/v1") {
        this.baseUrl = baseUrl;
    }

    // Raw, uncached GET request to a given Sleeper API endpoint; parses and returns JSON as type T
    private async get<T>(endpoint: string): Promise<T> {
        const response = await fetch(`${this.baseUrl}/${endpoint}`);
        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }
        return response.json() as Promise<T>;
    }

    // GET with a Postgres-backed cache: if a cached copy exists and hasn't expired yet, return it; otherwise fetch fresh and update the cache
    private async getCached<T>(endpoint: string, ttlHours: number = 24): Promise<T> {
        const cacheKey = endpoint;
        const result = await pool.query(
            "SELECT payload, fetched_at FROM sleeper_cache WHERE cache_key = $1",
            [cacheKey]
        );

        if (result.rows.length > 0) {
            const { payload, fetched_at } = result.rows[0];
            const ageMs = Date.now() - new Date(fetched_at).getTime();
            if (ageMs < ttlHours * 60 * 60 * 1000) {
                return payload as T;
            }
        }

        const fresh = await this.get<T>(endpoint);

        await pool.query(`
            INSERT INTO sleeper_cache (cache_key, payload, fetched_at)
            VALUES ($1, $2, now())
            ON CONFLICT (cache_key)
            DO UPDATE SET payload = $2, fetched_at = now()`,
            [cacheKey, JSON.stringify(fresh)]
        );
        return fresh;
    }

    async getPlayer(identifier: string): Promise<PlayerRecord | undefined> {
        const players = await this.refreshPlayers();
        return players[identifier];
    }

    async getLeague(identifier: string): Promise<League> {
        const endpoint = `league/${identifier}`;
        return this.get<League>(endpoint);
    }

    async getUser(identifier: string): Promise<UserRecord> {
        const endpoint = `user/${identifier}`;
        return this.get<UserRecord>(endpoint);
    }

    async getRosters(leagueId: string): Promise<Roster[]> {
        const endpoint = `league/${leagueId}/rosters`;
        return this.get<Roster[]>(endpoint);
    }

    async getWeeklyMatchups(leagueId: string, week: number) {
        const endpoint = `league/${leagueId}/matchups/${week}`;
        return this.get<any>(endpoint);
    }

    // Fetches players currently trending in adds/drops league wide (uncached)
    async getTrendingPlayers(
        type: "add" | "drop" = "add",
        lookbackHours: number = 24,
        limit: number = 25
    ): Promise<TrendingEntry[]> {
        const endpoint = `players/nfl/trending/${type}?lookback_hours=${lookbackHours}&limit=${limit}`;
        return this.get<TrendingEntry[]>(endpoint);
    }

    // Returns players with their `depth_chart_order`, optionally filtered by team/pos
    async getDepthChartEntries(team?: string, position?: string): Promise<PlayerRecord[]> {
        const players = await this.refreshPlayers();
        const entries: PlayerRecord[] = [];

        for (const [playerId, player] of Object.entries(players)) {
            if (player.depth_chart_order === null) {
                continue;
            }
            if (team && player.team !== team) {
                continue;
            }
            if (position && player.position !== position) {
                continue;
            }
            entries.push(player);
        }
        return entries.sort((a, b) => a.depth_chart_order! - b.depth_chart_order!);
    }

    // Returns only players carriying an `injury_status`
    async getInjuryRelevantPlayers(): Promise<PlayerRecord[]> {
        const players = await this.refreshPlayers();
        const entries: PlayerRecord[] = [];

        for (const [playerId, player] of Object.entries(players)) {
            if (!player.injury_status) {
                continue;
            }
            entries.push(player);
        }
        return entries;
    }
    
    // Returns all free-agent player_ids in the league (all players minus everyone currently rostered)
    async getFreeAgentPool(leagueId: string): Promise<string[]> {
        const rosters: Roster[] = await this.getRosters(leagueId);
        const rostered = new Set<string>();

        for (const roster of rosters) {
            const rosterPlayers = roster.players;
            for (const playerId of rosterPlayers) {
                rostered.add(playerId);
            }
        }
        const allPlayerIds = Object.keys(await this.refreshPlayers());
        const freeAgents = allPlayerIds.filter(playerId => !rostered.has(playerId));
        return freeAgents;
    }

    // Fetches the full NFL player dump, cached 24h per Sleepers own guidance
    async refreshPlayers(): Promise<Record<string, PlayerRecord>> {
        const endpoint = "players/nfl";
        return this.getCached<Record<string, PlayerRecord>>(
            endpoint,
            SleeperClient.PLAYERS_TTL_HOURS
        );
    }

}
