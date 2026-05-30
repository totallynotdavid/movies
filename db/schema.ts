import { index, integer, real, sqliteTable, text, uniqueIndex } from "void/schema-d1";
import type { MediaType } from "../src/domain/media";
import type { LibraryStatus } from "../src/domain/library";
import type { RatingSystem } from "../src/domain/rating";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("member"),
  ratingSystem: text("rating_system").$type<RatingSystem>().notNull().default("score100"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const media = sqliteTable(
  "media",
  {
    id: text("id").primaryKey(),
    mediaType: text("media_type").$type<MediaType>().notNull(),
    provider: text("provider").notNull().default("tmdb"),
    providerId: integer("provider_id").notNull(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    originalTitle: text("original_title"),
    overview: text("overview"),
    posterPath: text("poster_path"),
    backdropPath: text("backdrop_path"),
    releaseDate: text("release_date"),
    seasonCount: integer("season_count"),
    episodeCount: integer("episode_count"),
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

export const watchEvents = sqliteTable(
  "watch_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaId: text("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    mediaType: text("media_type").$type<MediaType>().notNull(),
    watchedAt: integer("watched_at").notNull(),
    watchedOn: text("watched_on").notNull(),
    episodeOrdinal: integer("episode_ordinal"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    index("idx_watch_user_watched_at").on(t.userId, t.watchedAt),
    index("idx_watch_user_watched_on").on(t.userId, t.watchedOn),
    index("idx_watch_user_media_watched_at").on(t.userId, t.mediaId, t.watchedAt),
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
    status: text("status").$type<LibraryStatus>().notNull(),
    score100: integer("score100"),
    notes: text("notes"),
    episodesWatched: integer("episodes_watched").notNull().default(0),
    lastWatchedAt: integer("last_watched_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("uq_library_user_media").on(t.userId, t.mediaId),
    index("idx_library_user_updated").on(t.userId, t.updatedAt),
  ],
);

export const userFavoriteMedia = sqliteTable(
  "user_favorite_media",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaId: text("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("uq_fav_media_user_media").on(t.userId, t.mediaId),
    index("idx_fav_media_user").on(t.userId),
  ],
);

export const userFavoriteActors = sqliteTable(
  "user_favorite_actors",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorTmdbId: integer("actor_tmdb_id").notNull(),
    actorName: text("actor_name").notNull(),
    actorProfilePath: text("actor_profile_path"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("uq_fav_actor_user_actor").on(t.userId, t.actorTmdbId),
    index("idx_fav_actor_user").on(t.userId),
  ],
);
