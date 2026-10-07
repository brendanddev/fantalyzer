import { SLEEPER_LEAGUES } from "../config.js";
import { SleeperClient, type League } from "./client.js";

const client = new SleeperClient();
const bagotLeague = SLEEPER_LEAGUES["bagot"];
const playerMap = await client.getPlayers();

if (bagotLeague) {
    const trendingPlayers = await client.getTrendingPlayers("add");
    for (const player of trendingPlayers) {
        console.log(`${player?.count} - ${player?.player_id}`);
    }
    console.log(trendingPlayers);
} else {
    console.log(`Invalid User ID`);
}
