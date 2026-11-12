import { SLEEPER_LEAGUES } from "../config/config.js";
import { SleeperClient } from "./client.js";

const PUKA_PLAYER_ID = '9493';

const client = new SleeperClient();
const emotiLeague = SLEEPER_LEAGUES["emoticon"];
const bLeague = SLEEPER_LEAGUES["bagot"];
const playerMap = await client.getPlayers();

if (bLeague) {
    const playerSeasonViews = await client.getPlayerSeasonView(PUKA_PLAYER_ID, 2026, 9);
    console.log(playerSeasonViews);

    // const trendingPlayers = await client.getTopFreeAgents(bLeague, 2026, 9, ['WR'], 10);
    // console.log(trendingPlayers);

    // const weeklyLeaders = await client.getWeeklyLeaders(2026, 9, ['RB']);
    // console.log(weeklyLeaders);

    // const rosters = await client.getRosters(emotiLeague);
    // console.log(rosters);

    //     // const state = await client.getNflState();
    //     // console.log(state);

    //     // const leagueStandings = await client.getLeagueStandings(emotiLeague);
    //     // console.log(leagueStandings);

    //     // const snapPercentage = await client.getSnapPercentageForWeek(PUKA_PLAYER_ID, 8);
    //     // console.log(snapPercentage);

    //     // const pukaStats = await client.getPlayerStatsByWeek(PUKA_PLAYER_ID);
    //     // const week8 = pukaStats["8"];
    //     // console.log(week8);

} else {
    console.log(`Invalid League ID`);
}
