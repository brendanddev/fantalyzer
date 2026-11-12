import { client, leagueId } from "@/lib/client";
import FreeAgentList from "@/components/FreeAgentList";
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
            <p><strong>Week:</strong> {week}</p>
            <p><strong>Limit:</strong> {limit}</p>

            <FreeAgentList agents={topFreeAgents} />
            <hr />
        </div>
    );
}
