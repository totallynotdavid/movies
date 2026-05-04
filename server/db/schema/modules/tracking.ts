import type { SqlDatabase } from "../../client";
import { createIndexes } from "../helpers";

export async function migrateTrackingSchema(db: SqlDatabase): Promise<void> {
  await db.schema
    .createTable("library_entries")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) => col.notNull().references("users.id").onDelete("cascade"))
    .addColumn("entity_id", "text", (col) =>
      col.notNull().references("entities.id").onDelete("cascade"),
    )
    .addColumn("status", "text", (col) => col.notNull())
    .addColumn("score100", "integer")
    .addColumn("progress_current", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("progress_total", "integer")
    .addColumn("started_on", "text")
    .addColumn("finished_on", "text")
    .addColumn("rewatch_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("notes", "text")
    .addColumn("updated_at", "text", (col) => col.notNull())
    .addUniqueConstraint("uq_library_entries_user_id_entity_id", ["user_id", "entity_id"])
    .execute();
  await db.schema
    .createTable("watch_events")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) => col.notNull().references("users.id").onDelete("cascade"))
    .addColumn("entity_id", "text", (col) =>
      col.notNull().references("entities.id").onDelete("cascade"),
    )
    .addColumn("episode_id", "text", (col) => col.references("episodes.id").onDelete("set null"))
    .addColumn("event_type", "text", (col) => col.notNull())
    .addColumn("watched_on", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) => col.notNull())
    .execute();
  await db.schema
    .createTable("episode_progress")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) => col.notNull().references("users.id").onDelete("cascade"))
    .addColumn("episode_id", "text", (col) =>
      col.notNull().references("episodes.id").onDelete("cascade"),
    )
    .addColumn("completed_at", "text")
    .addUniqueConstraint("uq_episode_progress_user_id_episode_id", ["user_id", "episode_id"])
    .execute();
  await createIndexes(db, [
    {
      name: "idx_library_entries_user_entity",
      table: "library_entries",
      columns: ["user_id", "entity_id"],
    },
    {
      name: "idx_library_entries_user_updated_at",
      table: "library_entries",
      columns: ["user_id", "updated_at"],
    },
    {
      name: "idx_watch_events_entity_created_at",
      table: "watch_events",
      columns: ["entity_id", "created_at"],
    },
    {
      name: "idx_watch_events_user_created_at",
      table: "watch_events",
      columns: ["user_id", "created_at"],
    },
  ]);
}
