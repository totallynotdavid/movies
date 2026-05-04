import type { SqlDatabase } from "../../client";
import { createIndexes } from "../helpers";

export async function migrateRecommendationsSchema(db: SqlDatabase): Promise<void> {
  await db.schema
    .createTable("recommendations")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) => col.notNull().references("users.id").onDelete("cascade"))
    .addColumn("entity_id", "text", (col) =>
      col.notNull().references("entities.id").onDelete("cascade"),
    )
    .addColumn("body", "text")
    .addColumn("created_at", "text", (col) => col.notNull())
    .execute();
  await db.schema
    .createTable("recommendation_votes")
    .ifNotExists()
    .addColumn("recommendation_id", "text", (col) =>
      col.notNull().references("recommendations.id").onDelete("cascade"),
    )
    .addColumn("user_id", "text", (col) => col.notNull().references("users.id").onDelete("cascade"))
    .addColumn("value", "integer", (col) => col.notNull())
    .addColumn("created_at", "text", (col) => col.notNull())
    .addPrimaryKeyConstraint("pk_recommendation_votes", ["recommendation_id", "user_id"])
    .execute();
  await createIndexes(db, [
    {
      name: "idx_recommendations_entity_created_at",
      table: "recommendations",
      columns: ["entity_id", "created_at"],
    },
  ]);
}
