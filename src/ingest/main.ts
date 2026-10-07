import { SLEEPER_LEAGUES } from "../config.js";
import { SleeperClient, type League } from "./client.js";

const client = new SleeperClient();
const bagotLeague = SLEEPER_LEAGUES["bagot"];

if (bagotLeague) {
    await client.getPlayers();
} else {
    console.log(`Invalid User ID`);
}
