import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable("sleeper_cache", {
        cache_key: { type: "text", primaryKey: true },
        payload: { type: "jsonb", notNull: true },
        fetched_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
    });
}

export async function down(pgm: MigrationBuilder): Promise<void> { 
    pgm.dropTable("sleeper_cache");
}
