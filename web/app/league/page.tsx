import LeagueStandings from "@/components/LeagueStandings";

export default async function League() {
    return (
        <main className="p-8">
            <h2 className="text-2xl font-semibold">League</h2>
            <LeagueStandings />
        </main>
    )
}
