import { Pool } from "pg";
import { DATABASE_URL } from "../config.js";

export const pool = new Pool({
    connectionString: DATABASE_URL,
});

interface LastInjuryStatus {
    injury_status: string | null;
    practice_participation: string | null;
}

export async function getLastInjuryStatus(playerId: string): Promise<LastInjuryStatus | undefined> {
    const result = await pool.query(`
        SELECT injury_status, practice_participation
        FROM player_injury_status WHERE player_id = $1`,
        [playerId]
    );

    if (result.rows.length > 0) {
        return result.rows[0];
    } else {
        return undefined;
    }
}

export async function upsertInjuryStatus(
    playerId: string,
    injuryStatus: string | null,
    practiceParticipation: string | null
): Promise<void> {
    await pool.query(`
        INSERT INTO player_injury_status (player_id, injury_status, practice_participation, updated_at)
        VALUES ($1, $2, $3, now())
        ON CONFLICT (player_id)
        DO UPDATE SET injury_status = $2, practice_participation = $3, updated_at = now()`,
        [playerId, injuryStatus, practiceParticipation]
    );
}
