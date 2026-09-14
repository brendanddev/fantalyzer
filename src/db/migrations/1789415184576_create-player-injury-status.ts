import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable("player_injury_status", {
        player_id: { type: "text", primaryKey: true },
        injury_status: { type: "text" },
        practice_participation: { type: "text" },
        updated_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
    });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable("player_injury_status");
}
