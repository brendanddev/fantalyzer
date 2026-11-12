import { client, leagueId, userId } from "@/lib/client";
import PlayerCard from "@/components/PlayerCard";

export default async function MyInjuries() {
    const rosters = await client.getLeagueRosters(leagueId);
    const myRoster = rosters.find(roster => roster.owner_id === userId);

    if (!myRoster) {
        return <div><p>Your roster wasn&apos;t found in this league.</p></div>;
    }

    const injuredStarters = myRoster.starters.filter(player => player.injury_status);
    const injuredBench = myRoster.bench.filter(player => player.injury_status);

    return (
        <div>
            <h4>My Injuries</h4>

            {injuredStarters.length === 0 && injuredBench.length === 0 && (
                <p>No injuries on your roster.</p>
            )}

            {injuredStarters.length > 0 && (
                <>
                    <h6>Starters</h6>
                    <ul>
                        {injuredStarters.map(player => (
                            <li key={player.player_id}>
                                <PlayerCard player={player} />
                            </li>
                        ))}
                    </ul>
                </>
            )}

            {injuredBench.length > 0 && (
                <>
                    <h6>Bench</h6>
                    <ul>
                        {injuredBench.map(player => (
                            <li key={player.player_id}>
                                <PlayerCard player={player} />
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
