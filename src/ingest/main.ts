import { SLEEPER_LEAGUES } from "../config.js";
import { SleeperClient } from "./client.js";

const client = new SleeperClient();
const bagotLeague = SLEEPER_LEAGUES["bagot"];
const playerMap = await client.getPlayers();

if (bagotLeague) {
    const weeklyLeaders = await client.getWeeklyLeaders(2026, 5, ['WR', 'K']);
    console.log(weeklyLeaders);
} else {
    console.log(`Invalid User ID`);
}


