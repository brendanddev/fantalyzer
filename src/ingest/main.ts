import { SLEEPER_LEAGUES } from "../config/config.js";
import { SleeperClient } from "./client.js";

const client = new SleeperClient();
const emotiLeague = SLEEPER_LEAGUES["emoticon"];
const playerMap = await client.getPlayers();

const PUKA_PLAYER_ID = '9493';

if (emotiLeague) {

    const injuredStarters = await client.getInjuredStarters(10);
    console.log(injuredStarters);

    const freeAgents = await client.getFreeAgents(emotiLeague);
    console.log(freeAgents);

    const puka = await client.getPlayerById(PUKA_PLAYER_ID);
    console.log(puka);

} else {
    console.log(`Invalid User ID`);
}
