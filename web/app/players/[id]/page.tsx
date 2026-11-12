import { client } from "@/lib/client";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function PlayerDetail({ params }: Props) {
    const { id } = await params;
    const player = await client.getPlayerById(id);

    if (!player) {
        return <div><h2>Player not found</h2></div>;
    }

    const state = await client.getNflState();
    const weeks = await client.getPlayerSeasonView(id, 2026, state.week);

    return (
        <div>
            <h2>{player.full_name}</h2>
            <p>
                {player.position} &middot; {player.team}
                {player.injury_status && ` · ${player.injury_status}`}
            </p>

            <hr />

            <table>
                <thead>
                    <tr>
                        <th>Week</th>
                        <th>Opponent</th>
                        <th>Projected</th>
                        <th>Actual</th>
                        <th>Snap %</th>
                    </tr>
                </thead>
                <tbody>
                    {weeks.map((week) => (
                        <tr key={week.week}>
                            <td>{week.week}</td>
                            <td>{week.opponent ?? "—"}</td>
                            <td>{week.projected_points?.toFixed(2) ?? "—"}</td>
                            <td>{week.actual_points?.toFixed(2) ?? "—"}</td>
                            <td>
                                {week.snap_percentage != null
                                    ? `${(week.snap_percentage * 100).toFixed(1)}%`
                                    : "—"}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
