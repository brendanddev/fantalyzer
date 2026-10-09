import { SLEEPER_LEAGUES } from "../config.js";
import { SleeperClient, type League, type PlayerWeekEntry } from "./client.js";

const client = new SleeperClient();
const bagotLeague = SLEEPER_LEAGUES["bagot"];
const playerMap = await client.getPlayers();

if (bagotLeague) {
    const defences = await client.getWeeklyLeaders(2026, 5, ['WR', 'K']);
    console.log(defences);

    // const trendingDefense = trendingPlayers.map(entry => 
    // console.log(trendingPlayers);
} else {
    console.log(`Invalid User ID`);
}


