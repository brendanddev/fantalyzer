import { join } from "node:path";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { FANTASY_POSITIONS, type DepthChart, type FantasyPosition, type FreeAgentView, type League, type LeagueStandings, type MatchupEntry, type NflState, type Player, type PlayerWeekEntry, type PlayerWeekView, type Roster, type RosterView, type RosterWithPlayers, type StandingsEntry, type TrendingEntry, type TrendingView, type User, type WeeklyEntries, type WeeklyLeaderEntry } from "./types.js";
import { combinePoints, compareByStandings, getBenchIds } from "./util.js";

const DATA_DIR = process.env.FANTALYZER_DATA_DIR ?? "data";
const PLAYERS_FILE = join(DATA_DIR, "players.json");
const PLAYERS_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const SLEEPER_API = "https://api.sleeper.app/v1";
const SLEEPER_PRIVATE_API = "https://api.sleeper.com";

export class SleeperClient {
    private baseUrl: string;
    private playerCache: Record<string, Player> | null = null;

    constructor(baseUrl: string = SLEEPER_API) {
        this.baseUrl = baseUrl;
    }

    public async get<T>(endpoint: string, base: string = this.baseUrl): Promise<T> {
        const response = await fetch(`${base}/${endpoint}`);
        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }
        return response.json() as Promise<T>;
    }

    // Makes a new request to the NFL player dump endpoint, writes it to disk as JSON, 
    // and stores in memory.
    private async refreshPlayerCache(): Promise<Record<string, Player>> {
        const players = await this.get<Record<string, Player>>("players/nfl");
        await mkdir(dirname(PLAYERS_FILE), { recursive: true });
        await writeFile(PLAYERS_FILE, JSON.stringify(players), "utf-8");
        this.playerCache = players;
        return players;
    }

    // Returns true if the given file is older than the specified cache window,
    // or dosent exist yet (stat throws, treated as stale).
    private async isCacheStale(file: string, maxAgeMs: number): Promise<boolean> {
        try {
            const stats = await stat(file);
            return Date.now() - stats.mtimeMs > maxAgeMs;
        } catch {
            return true;
        }
    }

    async getNflState(): Promise<NflState> {
        return this.get<NflState>(`state/nfl`);
    }

    async getLeague(leagueId: string): Promise<League> {
        return this.get<League>(`league/${leagueId}`);
    }

    async getRosters(leagueId: string): Promise<Roster[]> {
        return this.get<Roster[]>(`league/${leagueId}/rosters`);
    }

    async getUser(userId: string): Promise<User> {
        return this.get<User>(`user/${userId}`);
    }

    async getAllUsers(leagueId: string): Promise<User[]> {
        return this.get<User[]>(`league/${leagueId}/users`);
    }

    // Lookup from user_id to display_name for everyone in the league.
    private async getUserNames(leagueId: string): Promise<Record<string, string>> {
        const users = await this.getAllUsers(leagueId);
        const userNames: Record<string, string> = {};
        users.forEach(user => userNames[user.user_id] = user.display_name);
        return userNames;
    }

    // Turns player IDs into Player objects. IDs not in the map are dropped,
    // so the result can be shorter than the input.
    private async resolvePlayers(ids: string[]): Promise<Player[]> {
        const players: Player[] = [];
        const playerMap = await this.getPlayers();

        for (const id of ids) {
            const player = playerMap[id];
            if (player) {
                players.push(player);
            }
        }
        return players;
    }

    async getPlayers(forceRefresh = false): Promise<Record<string, Player>> {
        if (forceRefresh) return this.refreshPlayerCache();
        if (this.playerCache) return this.playerCache;
        if (await this.isCacheStale(PLAYERS_FILE, PLAYERS_CACHE_MAX_AGE_MS)) return this.refreshPlayerCache();

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

    async getTrendingPlayersByPosition(position: FantasyPosition, limit: number): Promise<TrendingEntry[]> {
        const playerMap = await this.getPlayers();
        const trendingPlayers = await this.getTrendingPlayers("add", 24, limit);
        return trendingPlayers.filter(entry => playerMap[entry.player_id]?.fantasy_positions?.includes(position));
    }

    async getWeeklyMatchups(leagueId: string, week: number): Promise<MatchupEntry[]> {
        return this.get<MatchupEntry[]>(`league/${leagueId}/matchups/${week}`);
    }

    // Returns all players carriying an `injury_status`.
    async getInjuryRelevantPlayers(): Promise<Player[]> {
        const players = await this.getPlayers();
        const entries: Player[] = [];

        for (const [playerId, player] of Object.entries(players)) {
            if (!player.injury_status) {
                continue;
            }
            entries.push(player);
        }
        return entries;
    }

    async getInjuredStarters(limit: number): Promise<Player[]> {
        const injuredPlayers: Player[] = await this.getInjuryRelevantPlayers();
        const injuryRelevantStarters: Player[] = injuredPlayers.filter(player =>
        (player.team && player.position && player.depth_chart_order === 1
            && (FANTASY_POSITIONS as readonly string[]).includes(player.position)))
            .slice(0, limit);

        return injuryRelevantStarters;
    }

    // Returns all free agents in the league.
    async getFreeAgents(leagueId: string): Promise<Player[]> {
        const rosters: Roster[] = await this.getRosters(leagueId);
        const rosteredPlayers = new Set<string>();

        for (const roster of rosters) {
            const playersOnRoster = roster.players;
            for (const playerId of playersOnRoster) {
                rosteredPlayers.add(playerId);
            }
        }
        const playerMap = await this.getPlayers();
        return Object.values(playerMap).filter(player => !rosteredPlayers.has(player.player_id));
    }

    async getSnapPercentageForWeek(playerId: string, week: number): Promise<number | undefined> {
        const playerStats = await this.getPlayerStatsByWeek(playerId);
        const weekEntry = playerStats[String(week)];

        if (!weekEntry) {
            return undefined;
        }

        const weekStats = weekEntry.stats;
        const offensiveSnaps = weekStats.off_snp;
        const totalOffensiveSnaps = weekStats.tm_off_snp;

        if (offensiveSnaps !== undefined && totalOffensiveSnaps) {
            return offensiveSnaps / totalOffensiveSnaps;
        } else {
            return undefined;
        }
    }

    // async getPlayerNews()


    // Uses Sleeper private API, undocumented, may break without notice.

    async getDepthChart(team: string): Promise<DepthChart> {
        return this.get<DepthChart>(`players/nfl/${team}/depth_chart`, SLEEPER_PRIVATE_API);
    }

    async getPlayerStats(playerId: string): Promise<PlayerWeekEntry> {
        return this.get<PlayerWeekEntry>(`stats/nfl/player/${playerId}?season_type=regular&season=2026`, SLEEPER_PRIVATE_API);
    }

    async getPlayerStatsByWeek(playerId: string): Promise<WeeklyEntries> {
        return this.get<WeeklyEntries>(`stats/nfl/player/${playerId}?season_type=regular&season=2026&grouping=week`, SLEEPER_PRIVATE_API);
    }

    async getPlayerProjectionsByWeek(playerId: string): Promise<WeeklyEntries> {
        return this.get<WeeklyEntries>(`projections/nfl/player/${playerId}?season_type=regular&season=2026&grouping=week`, SLEEPER_PRIVATE_API);
    }

    async getWeeklyLeaders(season: number, week: number, positions: FantasyPosition[]): Promise<WeeklyLeaderEntry[]> {
        const posParams = positions.map(pos => `position[]=${pos}`).join('&');
        const query = `?season_type=regular&${posParams}&order_by=pts_ppr`;
        return this.get<WeeklyLeaderEntry[]>(`stats/nfl/${season}/${week}${query}`, SLEEPER_PRIVATE_API);
    }


    // Assembled views for the dashboard. No joins left for the caller.

    async getLeagueStandings(leagueId: string): Promise<StandingsEntry[]> {
        const userNames = await this.getUserNames(leagueId);
        const rosters = await this.getRosters(leagueId);
        const orderedRosters = rosters.sort(compareByStandings);

        return orderedRosters.map((roster, idx) => ({
            rank: idx + 1,
            roster_id: roster.roster_id,
            owner_id: roster.owner_id,
            team_name: userNames[roster.owner_id] ?? "(unknown)",
            wins: roster.settings.wins,
            losses: roster.settings.losses,
            ties: roster.settings.ties,
            points: combinePoints(roster.settings.fpts, roster.settings.fpts_decimal),
            points_against: combinePoints(roster.settings.fpts_against, roster.settings.fpts_against_decimal)
        }));
    }

    // Trending adds or drops with the player attached, ordered by count descending.
    // Entries whose player isn't in the dump are dropped.
    async getTrendingView(type: "add" | "drop", lookbackHours = 24, limit = 10): Promise<TrendingView[]> {
        const views: TrendingView[] = [];
        const playerMap = await this.getPlayers();
        const trendingPlayers = await this.getTrendingPlayers(type, lookbackHours, limit);
        for (const trendingPlayer of trendingPlayers) {
            const player = playerMap[trendingPlayer.player_id];
            if (player) {
                const view: TrendingView = {
                    player,
                    count: trendingPlayer.count
                }
                views.push(view);
            }
        }
        return views;
    }

    async getLeagueRosters(leagueId: string): Promise<RosterView[]> {
        const rosterViews: RosterView[] = [];
        const rosters = await this.getRosters(leagueId);
        const userNames = await this.getUserNames(leagueId);

        for (const roster of rosters) {
            const rosterView: RosterView = {
                roster_id: roster.roster_id,
                owner_id: roster.owner_id,
                team_name: userNames[roster.owner_id] ?? "(unknown)",
                wins: roster.settings.wins,
                losses: roster.settings.losses,
                ties: roster.settings.ties,
                starters: await this.resolvePlayers(roster.starters),
                bench: await this.resolvePlayers(getBenchIds(roster)),
                reserve: await this.resolvePlayers(roster.reserve ?? []),
            };
            rosterViews.push(rosterView);
        }
        return rosterViews;
    }

    // Available players ranked by what they actually scored in a given week.
    // Crosses the weekly leaders list with the leagues free agents, keeping the leaders points order.
    async getTopFreeAgents(leagueId: string, season: number, week: number, positions: FantasyPosition[], limit?: number): Promise<FreeAgentView[]> {
        const views: FreeAgentView[] = [];
        const weeklyLeaders = await this.getWeeklyLeaders(season, week, positions);
        const freeAgents = await this.getFreeAgents(leagueId);
        const freeAgentIds = new Set(freeAgents.map(p => p.player_id));

        for (const leader of weeklyLeaders) {
            if (freeAgentIds.has(leader.player_id)) {
                const view: FreeAgentView = {
                    player_id: leader.player_id,
                    player_name: `${leader.player.first_name} ${leader.player.last_name}`,
                    position: leader.player.position,
                    team: leader.player.team,
                    fantasy_points: leader.stats.pts_ppr ?? 0,
                    position_rank: leader.stats.pos_rank_ppr ?? 999,
                };
                views.push(view);

                if (limit && views.length >= limit) break;
            }
        }
        return views;
    }

    // One entry per week through `throughWeek`, pairing a players projection with
    // what they actually scored. Weeks they missed come back will nulls.
    async getPlayerSeasonView(playerId: string, season: number, throughWeek: number): Promise<PlayerWeekView[]> {
        const views: PlayerWeekView[] = [];
        const playerWeekStats = await this.getPlayerStatsByWeek(playerId);
        const playerWeekProjections = await this.getPlayerProjectionsByWeek(playerId);

        for (let week = 1; week <= throughWeek; week++) {
            const currWeekStats = playerWeekStats[String(week)];
            const currWeekProjections = playerWeekProjections[String(week)];

            const offSnaps = currWeekStats?.stats?.off_snp;
            const teamSnaps = currWeekStats?.stats?.tm_off_snp;

            const view: PlayerWeekView = {
                week: week,
                opponent: currWeekStats?.opponent ?? null,
                actual_points: currWeekStats?.stats?.pts_ppr ?? null,
                projected_points: currWeekProjections?.stats?.pts_ppr ?? null,
                snap_percentage: offSnaps !== undefined && teamSnaps ? offSnaps / teamSnaps : null
            };
            views.push(view);
        }
        return views;
    }



}
