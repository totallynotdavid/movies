import type { SqlDatabase } from "../../client.ts";

export async function migrateListsSchema(db: SqlDatabase): Promise<void> {
  await db.schema
    .createTable("lists")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) => col.notNull().references("users.id").onDelete("cascade"))
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) => col.notNull())
    .execute();
  await db.schema
    .createTable("list_items")
    .ifNotExists()
    .addColumn("list_id", "text", (col) => col.notNull().references("lists.id").onDelete("cascade"))
    .addColumn("entity_id", "text", (col) =>
      col.notNull().references("entities.id").onDelete("cascade"),
    )
    .addColumn("position", "integer", (col) => col.notNull())
    .addPrimaryKeyConstraint("pk_list_items", ["list_id", "entity_id"])
    .execute();
  await db.schema
    .createTable("favorites")
    .ifNotExists()
    .addColumn("user_id", "text", (col) => col.notNull().references("users.id").onDelete("cascade"))
    .addColumn("entity_id", "text", (col) =>
      col.notNull().references("entities.id").onDelete("cascade"),
    )
    .addColumn("created_at", "text", (col) => col.notNull())
    .addPrimaryKeyConstraint("pk_favorites", ["user_id", "entity_id"])
    .execute();
}
