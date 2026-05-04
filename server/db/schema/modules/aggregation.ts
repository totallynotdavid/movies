import type { SqlDatabase } from "../../client";

export async function migrateAggregationSchema(db: SqlDatabase): Promise<void> {
  await db.schema
    .createTable("aggregate_snapshots")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("entity_id", "text", (col) =>
      col.notNull().references("entities.id").onDelete("cascade"),
    )
    .addColumn("average_score100", "real")
    .addColumn("tracked_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "text", (col) => col.notNull())
    .execute();
}
