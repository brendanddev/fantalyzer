import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable("trending_events", {
        id: "id",
        player_id: { type: "text", notNull: true },
        count: { type: "integer", notNull: true },
        fetched_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("now()"),
        },
    });
}

export async function down(pgm: MigrationBuilder): Promise<void> { 
    pgm.dropTable("trending_events");
}
