import { client, leagueId } from "@/lib/client";
import type { FantasyPosition } from "@fantalyzer/ingest/types.js";

interface Props {
    week: number;
    positions: FantasyPosition[];
    limit: number;
}

export default async function TopFreeAgents({ week, positions, limit }: Props) {
    const topFreeAgents = await client.getTopFreeAgents(leagueId, 2026, week, positions, limit);
    return (
        <div>
            <h4>Top Free Agents</h4>
            <p><strong>Week:</strong>{week}</p>
            <p><strong>Positions:</strong>To do...</p>
            <p><strong>Limit:</strong>{limit}</p>

            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Position</th>
                        <th>Team</th>
                        <th>Points</th>
                        <th>Rank</th>
                    </tr>
                </thead>

                <tbody>
                    {topFreeAgents.map((freeAgent) => (
                        <tr key={freeAgent.player_id}>
                            <td>{freeAgent.player_name}</td>
                            <td>{freeAgent.position}</td>
                            <td>{freeAgent.team}</td>
                            <td>{freeAgent.fantasy_points}</td>
                            <td>{freeAgent.position_rank}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <hr />
        </div>
    )
}
