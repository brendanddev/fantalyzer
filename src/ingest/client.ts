export interface TrendingEntry {
    player_id: string;
    count: number;
}

export class SleeperClient {
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

    async getTrendingPlayers(
        type: "add" | "drop" = "add",
        lookbackHours: number = 24,
        limit: number = 25
    ): Promise<TrendingEntry[]> {
        const endpoint = `players/nfl/trending/${type}?lookback_hours=${lookbackHours}&limit=${limit}`;
        return this.get<TrendingEntry[]>(endpoint);
    }
}
