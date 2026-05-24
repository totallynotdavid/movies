import { index, integer, real, sqliteTable, text, uniqueIndex } from "void/schema-d1";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("member"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const media = sqliteTable(
  "media",
  {
    id: text("id").primaryKey(),
    mediaType: text("media_type").$type<"movie" | "show">().notNull(),
    provider: text("provider").notNull().default("tmdb"),
    providerId: integer("provider_id").notNull(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    originalTitle: text("original_title"),
    overview: text("overview"),
    posterPath: text("poster_path"),
    backdropPath: text("backdrop_path"),
    releaseDate: text("release_date"),
    voteAverage: real("vote_average"),
    voteCount: integer("vote_count"),
    popularity: real("popularity"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("uq_media_provider_provider_id").on(t.provider, t.providerId),
    index("idx_media_type_popularity").on(t.mediaType, t.popularity),
    index("idx_media_title").on(t.title),
  ],
);

export const libraryEntries = sqliteTable(
  "library_entries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaId: text("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    status: text("status")
      .$type<"planned" | "watching" | "completed" | "paused" | "dropped">()
      .notNull(),
    score100: integer("score100"),
    progressCurrent: integer("progress_current").notNull().default(0),
    progressTotal: integer("progress_total"),
    notes: text("notes"),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("uq_library_user_media").on(t.userId, t.mediaId),
    index("idx_library_user_updated").on(t.userId, t.updatedAt),
  ],
);
