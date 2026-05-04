import type { SqlDatabase } from "../../client";

export async function migrateCacheSchema(db: SqlDatabase): Promise<void> {
  await db.schema
    .createTable("external_fetch_cache")
    .ifNotExists()
    .addColumn("key", "text", (col) => col.primaryKey())
    .addColumn("url", "text", (col) => col.notNull())
    .addColumn("body", "text", (col) => col.notNull())
    .addColumn("fetched_at", "text", (col) => col.notNull())
    .addColumn("stale_at", "text", (col) => col.notNull())
    .execute();
}
