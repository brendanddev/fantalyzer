import { readFile, stat, writeFile } from "node:fs/promises";

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
    roster_id: number;
    players: string[];
    starters: string[];
}

export interface User {
    user_id: string;
    username: string;
    display_name: string;
}

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

export interface RosterWithPlayers {
    roster_id: number;
    owner_id: string;
    players: (Player | undefined)[];
}

export interface TrendingEntry {
    player_id: string;
    count: number;
}

const PLAYERS_FILE = "data/players.json";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const SLEEPER_API = "https://api.sleeper.app/v1";
const SLEEPER_PRIVATE_API = "https://api.sleeper.com";

export class SleeperClient {
    private baseUrl: string;
    private playerCache: Record<string, Player> | null = null;

    constructor(baseUrl: string = SLEEPER_API) {
        this.baseUrl = baseUrl;
    }

    public async get<T>(endpoint: string, base: string = this.baseUrl): Promise<T> {
        const response = await fetch(`${this.baseUrl}/${endpoint}`);
        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }
        return response.json() as Promise<T>;
    }

    // Makes a new request to the NFL player dump endpoint, writes it to disk as JSON, 
    // and stores in memory.
    private async refreshPlayerCache(): Promise<Record<string, Player>> {
        const players = await this.get<Record<string, Player>>("players/nfl");
        await writeFile("data/players.json", JSON.stringify(players), "utf-8");
        this.playerCache = players;
        return players;
    }

    // Returns true if the players file is older than the cache window,
    // or dosent exist yet (stat throws, treated as stale).
    private async isCacheStale(): Promise<boolean> {
        try {
            const stats = await stat(PLAYERS_FILE);
            return Date.now() - stats.mtimeMs > CACHE_MAX_AGE_MS;
        } catch {
            return true;
        }
    }

    async getLeague(leagueId: string): Promise<League> {
        return this.get<League>(`league/${leagueId}`);
    }

    async getRosters(leagueId: string): Promise<Roster[]> {
        return this.get<Roster[]>(`league/${leagueId}/rosters`);
    }

    async getUser(userId: string): Promise<User | undefined> {
        return this.get<User>(`user/${userId}`);
    }

    async getAllUsers(leagueId: string): Promise<User[]> {
        return this.get<User[]>(`league/${leagueId}/users`);
    }

    async getPlayers(forceRefresh = false): Promise<Record<string, Player>> {
        if (forceRefresh) return this.refreshPlayerCache();
        if (this.playerCache) return this.playerCache;
        if (await this.isCacheStale()) return this.refreshPlayerCache();

        const raw = await readFile(PLAYERS_FILE, "utf-8");
        const players = JSON.parse(raw) as Record<string, Player>;
        this.playerCache = players;
        return players;
    }

    async getPlayerById(playerId: string): Promise<Player | undefined> {
        const players = await this.getPlayers();
        return players[playerId];
    }

    async getPlayersByRoster(leagueId: string): Promise<RosterWithPlayers[]> {
        const playerMap = await this.getPlayers();
        const rosters = await this.getRosters(leagueId);
        return rosters.map(roster => ({
            roster_id: roster.roster_id,
            owner_id: roster.owner_id,
            players: roster.players.map(id => playerMap[id])
        }));
    }

    async getTrendingPlayers(type: "add" | "drop", lookbackHours = 24, limit = 20): Promise<TrendingEntry[]> {
        return this.get(`players/nfl/trending/${type}?lookback_hours=${lookbackHours}&limit=${limit}`);
    }

    // Todo!
    // async getWeeklyMatchups(leagueId: string, week: number) {
    //     return this.get(`league/${leagueId}/matchups/${week}`);
    // }

}
