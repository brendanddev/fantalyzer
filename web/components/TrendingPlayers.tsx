import { client, leagueId } from "@/lib/client";

interface Props {
    type: "add" | "drop";
    lookback: number;
    limit: number;
}

export default async function TrendingPlayers({ type, lookback, limit }: Props) {
    const trendingPlayers = await client.getTrendingView(type, lookback, limit);
    return (
        <div>
            <h4>Trending Players</h4>
            <p><strong>Type:</strong>{type}</p>
            <p><strong>Lookback: </strong>{lookback}</p>
            <p><strong>Limit: </strong>{limit}</p>

            <ol>
                {trendingPlayers.map(trendingPlayer => (
                    <li key={trendingPlayer.player.player_id}>
                        {trendingPlayer.player.full_name} — {trendingPlayer.count}
                    </li>
                ))}
            </ol>
            <hr />
        </div>
    )
}
