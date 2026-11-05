import { SleeperClient } from "@fantalyzer/ingest/client.js";
import { SLEEPER_LEAGUES } from "@fantalyzer/config/config.js";
import { getBenchIds } from "@fantalyzer/ingest/util.js";

const client = new SleeperClient();
const leagueId = SLEEPER_LEAGUES["emoticon"];

export default async function LeagueRosters() {
    const leagueRosters = await client.getRosters(leagueId);
    const allUsers = await client.getAllUsers(leagueId);
    const allPlayers = await client.getPlayers();

    const userNames: Record<string, string> = {};
    allUsers.forEach(user => userNames[user.user_id] = user.display_name);    

    return (
        <div>
            <h4>League Rosters</h4>

            {leagueRosters.map(roster => {
                const bench = getBenchIds(roster);

                return (
                    <div key={roster.roster_id}>
                        <h5>{userNames[roster.owner_id]}</h5>
                        <h6>Starters</h6>
                        <ul>
                            {roster.starters.map(id => (
                                <li key={id}>{allPlayers[id]?.full_name}</li>
                            ))}
                        </ul>
                        
                        <h6>Bench</h6>
                        <ul>
                            {bench.map(id => (
                                <li key={id}>{allPlayers[id]?.full_name}</li>
                            ))}
                        </ul>

                        <h6>Reserved</h6>
                        <ul>
                            {roster.reserve?.map(id => (
                                <li key={id}>{allPlayers[id]?.full_name}</li>
                            ))}
                        </ul>
                    </div>
                );
            })}
        </div>
    )
}
