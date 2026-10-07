import { writeFile } from "node:fs/promises";

export interface League {
    league_id: string;
    name: string;
    status: string;
    season: string;
    sport: string;
    total_rosters: number;
}

export interface Roster {
    league_id: string;
    owner_id: string;
    roster_id: string;
    players: string[];
}

export interface User {
    user_id: string;
    username: string;
    display_name: string;
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

    async getLeague(leagueId: string): Promise<League> {
        return this.get<League>(`league/${leagueId}`);
    }

    async getRosters(leagueId: string): Promise<Roster[]> {
        return this.get<Roster[]>(`league/${leagueId}/rosters`);
    }

    async getUser(userId: string) {
        return this.get<User>(`user/${userId}`);
    }

    async getPlayers(): Promise<void> {
        const playerData = await this.get("players/nfl");
        await writeFile("data/players.json", JSON.stringify(playerData), "utf-8");
    }

    // Todo!
    // async getWeeklyMatchups(leagueId: string, week: number) {
    //     return this.get(`league/${leagueId}/matchups/${week}`);
    // }

    // async getTrendingPlayers(type: string, lookback: number, limit: number) { 
    //      return this.get(players/nfl/trending/TYPE?lookback_hours=$HRS&limit=LIMIT`);
    // }

}
