import { client, leagueId, userId } from "@/lib/client";

export default async function MyTeamSummary() {
    const leagueStandings = await client.getLeagueStandings(leagueId);
    const myTeam = leagueStandings.find(team => team.owner_id === userId);
    
    if (!myTeam) {
        return <div><p>Your team wasn't found in this league.</p></div>;
    }

    return (
        <div>
            <h4>My Team</h4>
            <p>{myTeam.team_name}</p>
            <p>
                Rank {myTeam.rank} of {leagueStandings.length} &middot;{" "}
                {myTeam.wins}-{myTeam.losses}
                {myTeam.ties > 0 && `-${myTeam.ties}`}
            </p>
            <p>
                PF {myTeam.points.toFixed(2)} &middot; PA {myTeam.points_against.toFixed(2)}
            </p>
        </div>
    );
}
