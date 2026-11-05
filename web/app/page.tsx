import NflStateBanner from "@/components/NflStateBanner";
import LeagueStandings from "@/components/LeagueStandings";
import LeagueRosters from "@/components/LeagueRosters";

export default async function Home() {
	return (
		<main className="p-8">
			<h1 className="text-2xl font-semibold">Fantalyzer</h1>
			<NflStateBanner />
			<LeagueStandings />
			<LeagueRosters />
		</main>
	);
}
