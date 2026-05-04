import type { SqlDatabase } from "../../client.ts";
import { createIndexes } from "../helpers.ts";

async function createUsersTable(db: SqlDatabase) {
  await db.schema
    .createTable("users")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("email", "text", (col) => col.notNull().unique())
    .addColumn("username", "text", (col) => col.notNull().unique())
    .addColumn("password_hash", "text", (col) => col.notNull())
    .addColumn("score_system", "text", (col) => col.notNull().defaultTo("100"))
    .addColumn("is_admin", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("is_excluded_from_aggregation", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "text", (col) => col.notNull())
    .addColumn("updated_at", "text", (col) => col.notNull())
    .execute();
}

export async function migrateAuthSchema(db: SqlDatabase): Promise<void> {
  await createUsersTable(db);
  await db.schema
    .createTable("user_sessions")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) => col.notNull().references("users.id").onDelete("cascade"))
    .addColumn("token_hash", "text", (col) => col.notNull().unique())
    .addColumn("csrf_token_hash", "text", (col) => col.notNull())
    .addColumn("expires_at", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) => col.notNull())
    .execute();
  await db.schema
    .createTable("request_sessions")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) => col.references("users.id").onDelete("set null"))
    .addColumn("session_id", "text", (col) =>
      col.references("user_sessions.id").onDelete("set null"),
    )
    .addColumn("ip_hash", "text")
    .addColumn("user_agent", "text")
    .addColumn("created_at", "text", (col) => col.notNull())
    .execute();
  await db.schema
    .createTable("auth_events")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) => col.references("users.id").onDelete("set null"))
    .addColumn("event_type", "text", (col) => col.notNull())
    .addColumn("ip_hash", "text")
    .addColumn("created_at", "text", (col) => col.notNull())
    .execute();
  await db.schema
    .createTable("auth_throttle_counters")
    .ifNotExists()
    .addColumn("key", "text", (col) => col.primaryKey())
    .addColumn("attempts", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("locked_until", "text")
    .addColumn("updated_at", "text", (col) => col.notNull())
    .execute();
  await createIndexes(db, [
    { name: "idx_user_sessions_user_id", table: "user_sessions", columns: ["user_id"] },
    { name: "idx_user_sessions_expires_at", table: "user_sessions", columns: ["expires_at"] },
    {
      name: "idx_request_sessions_user_created_at",
      table: "request_sessions",
      columns: ["user_id", "created_at"],
    },
    {
      name: "idx_auth_events_user_id_created_at",
      table: "auth_events",
      columns: ["user_id", "created_at"],
    },
  ]);
}
