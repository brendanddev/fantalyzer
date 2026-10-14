import { SLEEPER_LEAGUES } from "../config/config.js";
import { SleeperClient } from "./client.js";

const client = new SleeperClient();
const emotiLeague = SLEEPER_LEAGUES["emoticon"];
const playerMap = await client.getPlayers();

if (emotiLeague) {
    // const standings = await client.getLeagueStandings(emotiLeague);
    // console.log(standings);

    // matchup_id 
    // roster_id x2

    const matchups = await client.getWeeklyMatchups(emotiLeague, 6);
    for (const matchup of matchups) {
        console.log(matchup);
    }
    // console.log(matchups);

} else {
    console.log(`Invalid User ID`);
}
