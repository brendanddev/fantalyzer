import { SLEEPER_LEAGUES } from "../config.js";
import { SleeperClient, type League, type PlayerWeekEntry } from "./client.js";

const client = new SleeperClient();
const bagotLeague = SLEEPER_LEAGUES["bagot"];
const playerMap = await client.getPlayers();

if (bagotLeague) {
    const playerStats: PlayerWeekEntry = await client.getPlayerStats("9493");
    // console.log({
    //     player_id: playerStats.player_id,
    //     week: playerStats.week,
    //     season: playerStats.season,
    //     team: playerStats.team,
    //     opponent: playerStats.opponent,
    //     game_id: playerStats.game_id,
    //     date: playerStats.date,
    //     category: playerStats.category,
    //     stats: playerStats.stats,
    // });

    // console.log("===== Player Stats ====");
    // const playerStats = await client.getPlayerStats("9493");
    // console.log(playerStats);

} else {
    console.log(`Invalid User ID`);
}
