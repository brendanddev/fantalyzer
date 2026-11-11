import NflStateBanner from "@/components/NflStateBanner";
import LeagueStandings from "@/components/LeagueStandings";
import LeagueRosters from "@/components/LeagueRosters";
import TrendingPlayers from "@/components/TrendingPlayers";
import TopFreeAgents from "@/components/TopFreeAgents";

export default async function Home() {
	return (
		<main className="p-8">
			<h1 className="text-2xl font-semibold">Fantalyzer</h1>
			<NflStateBanner />
			<LeagueStandings />
			<LeagueRosters />
			<TrendingPlayers type="add" lookback={24} limit={10} />
			<TopFreeAgents week={9} positions={["WR"]} limit={10} />
		</main>
	);
}
