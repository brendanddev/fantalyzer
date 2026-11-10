import { client, leagueId } from "@/lib/client";

export default async function LeagueStandings() {
    const leagueStandings = await client.getLeagueStandings(leagueId);

    return (
        <div>
            <h4>League Standings</h4>

            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Team Name</th>
                        <th>Wins</th>
                        <th>Losses</th>
                        <th>Ties</th>
                        <th>Points</th>
                        <th>Points Against</th>
                    </tr>
                </thead>

                <tbody>
                    {leagueStandings.map((team) => (
                        <tr key={team.rank}>
                            <td>{team.rank}</td>
                            <td>{team.team_name}</td>
                            <td>{team.wins}</td>
                            <td>{team.losses}</td>
                            <td>{team.ties}</td>
                            <td>{team.points.toFixed(2)}</td>
                            <td>{team.points_against.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
