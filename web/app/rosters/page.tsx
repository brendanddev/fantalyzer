import LeagueRosters from "@/components/LeagueRosters";


export default async function Rosters() {
	return (
		<main className="p-8">
			<h2 className="text-2xl font-semibold">Rosters</h2>
            <LeagueRosters />
        </main>
    )
}