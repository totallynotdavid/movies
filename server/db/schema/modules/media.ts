import type { SqlDatabase } from "../../client";
import { createIndexes } from "../helpers";

export async function migrateMediaSchema(db: SqlDatabase): Promise<void> {
  await db.schema
    .createTable("entities")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("type", "text", (col) => col.notNull())
    .addColumn("slug", "text", (col) => col.notNull().unique())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("original_title", "text")
    .addColumn("overview", "text")
    .addColumn("poster_path", "text")
    .addColumn("backdrop_path", "text")
    .addColumn("tmdb_id", "integer", (col) => col.notNull())
    .addColumn("release_date", "text")
    .addColumn("first_air_date", "text")
    .addColumn("vote_average", "real")
    .addColumn("vote_count", "integer")
    .addColumn("popularity", "real")
    .addColumn("fetched_at", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) => col.notNull())
    .addColumn("updated_at", "text", (col) => col.notNull())
    .addUniqueConstraint("uq_entities_type_tmdb_id", ["type", "tmdb_id"])
    .execute();
  await db.schema
    .createTable("movies")
    .ifNotExists()
    .addColumn("entity_id", "text", (col) =>
      col.primaryKey().references("entities.id").onDelete("cascade"),
    )
    .addColumn("runtime_minutes", "integer")
    .execute();
  await db.schema
    .createTable("shows")
    .ifNotExists()
    .addColumn("entity_id", "text", (col) =>
      col.primaryKey().references("entities.id").onDelete("cascade"),
    )
    .addColumn("episode_count", "integer")
    .addColumn("season_count", "integer")
    .execute();
  await db.schema
    .createTable("seasons")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("show_id", "text", (col) =>
      col.notNull().references("shows.entity_id").onDelete("cascade"),
    )
    .addColumn("season_number", "integer", (col) => col.notNull())
    .addColumn("name", "text")
    .addColumn("tmdb_id", "integer")
    .addUniqueConstraint("uq_seasons_show_id_season_number", ["show_id", "season_number"])
    .execute();
  await db.schema
    .createTable("episodes")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("season_id", "text", (col) =>
      col.notNull().references("seasons.id").onDelete("cascade"),
    )
    .addColumn("episode_number", "integer", (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("tmdb_id", "integer", (col) => col.unique())
    .addColumn("air_date", "text")
    .addUniqueConstraint("uq_episodes_season_id_episode_number", ["season_id", "episode_number"])
    .execute();
  await db.schema
    .createTable("entity_genres")
    .ifNotExists()
    .addColumn("entity_id", "text", (col) =>
      col.notNull().references("entities.id").onDelete("cascade"),
    )
    .addColumn("genre_id", "integer", (col) => col.notNull())
    .addColumn("genre_name", "text", (col) => col.notNull())
    .addPrimaryKeyConstraint("pk_entity_genres", ["entity_id", "genre_id"])
    .execute();
  await db.schema
    .createTable("entity_people")
    .ifNotExists()
    .addColumn("entity_id", "text", (col) =>
      col.notNull().references("entities.id").onDelete("cascade"),
    )
    .addColumn("person_id", "integer", (col) => col.notNull())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("role", "text", (col) => col.notNull())
    .addPrimaryKeyConstraint("pk_entity_people", ["entity_id", "person_id", "role"])
    .execute();
  await db.schema
    .createTable("entity_studios")
    .ifNotExists()
    .addColumn("entity_id", "text", (col) =>
      col.notNull().references("entities.id").onDelete("cascade"),
    )
    .addColumn("studio_id", "integer", (col) => col.notNull())
    .addColumn("name", "text", (col) => col.notNull())
    .addPrimaryKeyConstraint("pk_entity_studios", ["entity_id", "studio_id"])
    .execute();
  await createIndexes(db, [
    { name: "idx_entities_type_title", table: "entities", columns: ["type", "title"] },
    { name: "idx_entities_title", table: "entities", columns: ["title"] },
  ]);
}
