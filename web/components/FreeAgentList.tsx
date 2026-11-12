"use client";

import { useState } from "react";
import type { FreeAgentView } from "@fantalyzer/ingest/types.js";

interface Props {
    agents: FreeAgentView[];
}

// Client component - holds the selected position in state. The parent fetches
// the full list. This only filters what its given.
export default function FreeAgentList({ agents }: Props) {
    const [position, setPosition] = useState("ALL");

    const visible = position === "ALL"
        ? agents
        : agents.filter(agent => agent.position === position);

    return (
        <div>
            <select value={position} onChange={e => setPosition(e.target.value)}>
                <option value="ALL">All</option>
                <option value="QB">QB</option>
                <option value="RB">RB</option>
                <option value="WR">WR</option>
                <option value="TE">TE</option>
            </select>

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
                    {visible.map((freeAgent) => (
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
        </div>
    );
}
