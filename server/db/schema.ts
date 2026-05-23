import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "void/schema-d1";
import type { TrackingStatus } from "#shared/types/tracking";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  scoreSystem: text("score_system").notNull().default("100"),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  isExcludedFromAggregation: integer("is_excluded_from_aggregation", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const userSessions = sqliteTable(
  "user_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    csrfTokenHash: text("csrf_token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("idx_user_sessions_user_id").on(t.userId),
    index("idx_user_sessions_expires_at").on(t.expiresAt),
  ],
);

export const requestSessions = sqliteTable(
  "request_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    sessionId: text("session_id").references(() => userSessions.id, { onDelete: "set null" }),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_request_sessions_user_created_at").on(t.userId, t.createdAt)],
);

export const authEvents = sqliteTable(
  "auth_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull(),
    ipHash: text("ip_hash"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_auth_events_user_id_created_at").on(t.userId, t.createdAt)],
);

export const authThrottleCounters = sqliteTable("auth_throttle_counters", {
  key: text("key").primaryKey(),
  attempts: integer("attempts").notNull().default(0),
  lockedUntil: text("locked_until"),
  updatedAt: text("updated_at").notNull(),
});

export const entities = sqliteTable(
  "entities",
  {
    id: text("id").primaryKey(),
    type: text("type").$type<"movie" | "show">().notNull(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    originalTitle: text("original_title"),
    overview: text("overview"),
    posterPath: text("poster_path"),
    backdropPath: text("backdrop_path"),
    tmdbId: integer("tmdb_id").notNull(),
    releaseDate: text("release_date"),
    firstAirDate: text("first_air_date"),
    voteAverage: real("vote_average"),
    voteCount: integer("vote_count"),
    popularity: real("popularity"),
    fetchedAt: text("fetched_at").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("uq_entities_type_tmdb_id").on(t.type, t.tmdbId),
    index("idx_entities_type_title").on(t.type, t.title),
    index("idx_entities_title").on(t.title),
  ],
);

export const movies = sqliteTable("movies", {
  entityId: text("entity_id")
    .primaryKey()
    .references(() => entities.id, { onDelete: "cascade" }),
  runtimeMinutes: integer("runtime_minutes"),
});

export const shows = sqliteTable("shows", {
  entityId: text("entity_id")
    .primaryKey()
    .references(() => entities.id, { onDelete: "cascade" }),
  episodeCount: integer("episode_count"),
  seasonCount: integer("season_count"),
});

export const seasons = sqliteTable(
  "seasons",
  {
    id: text("id").primaryKey(),
    showId: text("show_id")
      .notNull()
      .references(() => shows.entityId, { onDelete: "cascade" }),
    seasonNumber: integer("season_number").notNull(),
    name: text("name"),
    tmdbId: integer("tmdb_id"),
  },
  (t) => [uniqueIndex("uq_seasons_show_id_season_number").on(t.showId, t.seasonNumber)],
);

export const episodes = sqliteTable(
  "episodes",
  {
    id: text("id").primaryKey(),
    seasonId: text("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    episodeNumber: integer("episode_number").notNull(),
    title: text("title").notNull(),
    tmdbId: integer("tmdb_id").unique(),
    airDate: text("air_date"),
  },
  (t) => [uniqueIndex("uq_episodes_season_id_episode_number").on(t.seasonId, t.episodeNumber)],
);

export const entityGenres = sqliteTable(
  "entity_genres",
  {
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    genreId: integer("genre_id").notNull(),
    genreName: text("genre_name").notNull(),
  },
  (t) => [primaryKey({ columns: [t.entityId, t.genreId] })],
);

export const entityPeople = sqliteTable(
  "entity_people",
  {
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    personId: integer("person_id").notNull(),
    name: text("name").notNull(),
    role: text("role").notNull(),
  },
  (t) => [primaryKey({ columns: [t.entityId, t.personId, t.role] })],
);

export const entityStudios = sqliteTable(
  "entity_studios",
  {
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    studioId: integer("studio_id").notNull(),
    name: text("name").notNull(),
  },
  (t) => [primaryKey({ columns: [t.entityId, t.studioId] })],
);

export const libraryEntries = sqliteTable(
  "library_entries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    status: text("status").$type<TrackingStatus>().notNull(),
    score100: integer("score100"),
    progressCurrent: integer("progress_current").notNull().default(0),
    progressTotal: integer("progress_total"),
    startedOn: text("started_on"),
    finishedOn: text("finished_on"),
    rewatchCount: integer("rewatch_count").notNull().default(0),
    notes: text("notes"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("uq_library_entries_user_id_entity_id").on(t.userId, t.entityId),
    index("idx_library_entries_user_entity").on(t.userId, t.entityId),
    index("idx_library_entries_user_updated_at").on(t.userId, t.updatedAt),
  ],
);

export const watchEvents = sqliteTable(
  "watch_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    episodeId: text("episode_id").references(() => episodes.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull(),
    watchedOn: text("watched_on").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("idx_watch_events_entity_created_at").on(t.entityId, t.createdAt),
    index("idx_watch_events_user_created_at").on(t.userId, t.createdAt),
  ],
);

export const episodeProgress = sqliteTable(
  "episode_progress",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    episodeId: text("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    completedAt: text("completed_at"),
  },
  (t) => [uniqueIndex("uq_episode_progress_user_id_episode_id").on(t.userId, t.episodeId)],
);

export const lists = sqliteTable("lists", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: text("created_at").notNull(),
});

export const listItems = sqliteTable(
  "list_items",
  {
    listId: text("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.listId, t.entityId] })],
);

export const favorites = sqliteTable(
  "favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.entityId] })],
);

export const recommendations = sqliteTable(
  "recommendations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    body: text("body"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_recommendations_entity_created_at").on(t.entityId, t.createdAt)],
);

export const recommendationVotes = sqliteTable(
  "recommendation_votes",
  {
    recommendationId: text("recommendation_id")
      .notNull()
      .references(() => recommendations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    value: integer("value").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.recommendationId, t.userId] })],
);

export const aggregateSnapshots = sqliteTable("aggregate_snapshots", {
  id: text("id").primaryKey(),
  entityId: text("entity_id")
    .notNull()
    .references(() => entities.id, { onDelete: "cascade" }),
  averageScore100: real("average_score100"),
  trackedCount: integer("tracked_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
});
