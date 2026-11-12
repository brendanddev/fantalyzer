import MyInjuries from "@/components/MyInjuries";
import MyTeamSummary from "@/components/MyTeamSummary";
import TopPickups from "@/components/TopPickups";

export default async function Home() {
	return (
		<main className="p-8">
			<h1 className="text-2xl font-semibold">Dashboard</h1>
			<MyTeamSummary />
			<MyInjuries />
			<TopPickups />
		</main>
	);
}
