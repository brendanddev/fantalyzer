import { SleeperClient } from './client.js'
import { pool } from "../db/db.js";

const client = new SleeperClient();
const trending = await client.getTrendingPlayers();

for (const entry of trending) {
    await pool.query(
        "INSERT INTO trending_events (player_id, count) VALUES ($1, $2)",
        [entry.player_id, entry.count]
    );
}

console.log(`Inserted ${trending.length} trending events`);

const players = await client.refreshPlayers();
console.log(Object.keys(players).length, "players cached");
console.log(players["5850"]);
