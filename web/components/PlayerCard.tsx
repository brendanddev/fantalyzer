import Link from "next/link";
import type { Player } from "@fantalyzer/ingest/types.js";

interface Props {
    player: Player;
}

export default function PlayerCard({ player }: Props) {
    return (
        <div>
            <Link href={`/players/${player.player_id}`}>
                <span>{player.full_name}</span>
                <span>{player.position}</span>
                <span>{player.team}</span>
                {player.injury_status && <span>{player.injury_status}</span>}
            </Link>
        </div>
    );
}
