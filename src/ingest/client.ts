import { pool } from "../db/db.js";

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
}

export class SleeperClient {
    private static readonly PLAYERS_TTL_HOURS = 24;
    private baseUrl: string;

    constructor(baseUrl: string = "https://api.sleeper.app/v1") {
        this.baseUrl = baseUrl;
    }

    private async get<T>(endpoint: string): Promise<T> {
        const response = await fetch(`${this.baseUrl}/${endpoint}`);
        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }
        return response.json() as Promise<T>;
    }
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

    async getTrendingPlayers(
        type: "add" | "drop" = "add",
        lookbackHours: number = 24,
        limit: number = 25
    ): Promise<TrendingEntry[]> {
        const endpoint = `players/nfl/trending/${type}?lookback_hours=${lookbackHours}&limit=${limit}`;
        return this.get<TrendingEntry[]>(endpoint);
    }

    async refreshPlayers(): Promise<Record<string, PlayerRecord>> {
        const endpoint = "players/nfl";
        return this.getCached<Record<string, PlayerRecord>>(
            endpoint,
            SleeperClient.PLAYERS_TTL_HOURS
        );
    }


}


//  def refresh_players(self):
//         """
//         Full player dump, Sleeper says to cache this and pull once a day,
//         not on every request.
//         """
//         return self._get_cached("players/nfl", ttl=PLAYERS_TTL_SECONDS)
