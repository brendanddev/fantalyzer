import { client, leagueId } from "@/lib/client";
import PlayerCard from "@/components/PlayerCard";

export default async function LeagueRosters() {
    const rosters = await client.getLeagueRosters(leagueId);

    return (
        <div><h4>League Rosters</h4>
            <hr />

            {rosters.map(roster => (
                <div key={roster.roster_id}>
                    <h5>{roster.team_name}</h5>

                    <h6>Starters</h6>
                    <ul>
                        {roster.starters.map(player => (
                            <li key={player.player_id}>
                                <PlayerCard player={player} />
                            </li>
                        ))}
                    </ul>

                    <h6>Bench</h6>
                    <ul>
                        {roster.bench.map(player => (
                            <li key={player.player_id}>
                                <PlayerCard player={player} />
                            </li>
                        ))}
                    </ul>

                    <h6>Reserved</h6>
                    <ul>
                        {roster.reserve.map(player => (
                            <li key={player.player_id}>
                                <PlayerCard player={player} />
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
            <hr />
        </div>
    );
}
