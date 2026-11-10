import { client } from "@/lib/client";

export default async function NflStateBanner() {
    const state = await client.getNflState();
    return (
        <div>
            <p>Week {state.week} &middot; {state.season} &middot; {state.season_type} </p>
            <hr />
        </div>
    )
}
