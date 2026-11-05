import { SleeperClient } from "@fantalyzer/ingest/client.js";

const client = new SleeperClient();

export default async function NflStateBanner() {
    const state = await client.getNflState();
    return (
        <p>Week {state.week} &middot; {state.season} &middot; {state.season_type} </p>
    )
}
