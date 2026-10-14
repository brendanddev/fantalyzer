import { SLEEPER_LEAGUES } from "../config/config.js";
import { SleeperClient } from "./client.js";

const client = new SleeperClient();
const emotiLeague = SLEEPER_LEAGUES["emoticon"];
const playerMap = await client.getPlayers();

if (emotiLeague) {
    const standings = await client.getLeagueStandings(emotiLeague);
    console.log(standings);
} else {
    console.log(`Invalid User ID`);
}
