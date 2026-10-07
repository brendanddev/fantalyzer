import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable('player_news', {
        topic_id: { type: "text", primaryKey: true },
        player_id: { type: "text", notNull: true },
        title: { type: "text", notNull: true },
        description: { type: "text", notNull: false },
        analysis: { type: "text", notNull: false },
        url: { type: "text", notNull: false },
        source: { type: "text", notNull: false },
        published: { type: "bigint" },
        seen_at: { type: "timestamp", notNull: true, default: pgm.func("now()") }
    });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable('player_news');
}
