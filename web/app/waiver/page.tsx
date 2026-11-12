import TrendingPlayers from "@/components/TrendingPlayers";
import TopFreeAgents from "@/components/TopFreeAgents";

export default function WaiverWire() {
    return (
        <main className="p-8">
            <h1>Waiver Wire</h1>
            <TrendingPlayers type="add" lookback={24} limit={10} />
            <TopFreeAgents week={9} positions={["QB", "RB", "WR", "TE"]} limit={10} />
        </main>
    );
}
