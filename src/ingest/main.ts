import { SLEEPER_LEAGUES } from "../config/config.js";
import { SleeperClient } from "./client.js";

const client = new SleeperClient();
const emotiLeague = SLEEPER_LEAGUES["emoticon"];
const playerMap = await client.getPlayers();

const PUKA_PLAYER_ID = '9493';

if (emotiLeague) {
    const snapPercentage = await client.getSnapPercentageForWeek(PUKA_PLAYER_ID, 8);
    console.log(snapPercentage);

    const pukaStats = await client.getPlayerStatsByWeek(PUKA_PLAYER_ID);
    const week8 = pukaStats["8"];
    console.log(week8);

} else {
    console.log(`Invalid User ID`);
}
