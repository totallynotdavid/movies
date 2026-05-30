import { index, integer, real, sqliteTable, text, uniqueIndex } from "void/schema-d1";
import type { MediaStatus, MediaType } from "../src/domain/media";
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
    tmdbId: integer("tmdb_id").notNull(),
    mediaType: text("media_type").$type<MediaType>().notNull(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    originalTitle: text("original_title"),
    overview: text("overview"),
    tagline: text("tagline"),
    posterPath: text("poster_path"),
    backdropPath: text("backdrop_path"),
    releaseDate: text("release_date"),
    lastAirDate: text("last_air_date"),
    runtime: integer("runtime"),
    seasonCount: integer("season_count"),
    episodeCount: integer("episode_count"),
    status: text("status").$type<MediaStatus>(),
    inProduction: integer("in_production"),
    originalLanguage: text("original_language"),
    certification: text("certification"),
    imdbId: text("imdb_id"),
    voteAverage: real("vote_average"),
    voteCount: integer("vote_count"),
    popularity: real("popularity"),
    detailsHydratedAt: integer("details_hydrated_at"),
    detailsError: text("details_error"),
    episodesHydratedAt: integer("episodes_hydrated_at"),
    episodesError: text("episodes_error"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("uq_media_type_tmdb").on(t.mediaType, t.tmdbId),
    index("idx_media_type_popularity").on(t.mediaType, t.popularity),
    index("idx_media_title").on(t.title),
  ],
);

export const people = sqliteTable(
  "people",
  {
    id: text("id").primaryKey(),
    tmdbId: integer("tmdb_id").notNull(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    gender: integer("gender"),
    knownForDepartment: text("known_for_department"),
    birthday: text("birthday"),
    deathday: text("deathday"),
    placeOfBirth: text("place_of_birth"),
    biography: text("biography"),
    profilePath: text("profile_path"),
    popularity: real("popularity"),
    imdbId: text("imdb_id"),
    detailsHydratedAt: integer("details_hydrated_at"),
    detailsError: text("details_error"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("uq_people_tmdb").on(t.tmdbId),
    index("idx_people_popularity").on(t.popularity),
  ],
);

export const castCredits = sqliteTable(
  "cast_credits",
  {
    id: text("id").primaryKey(),
    mediaId: text("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    character: text("character"),
    billingOrder: integer("billing_order"),
    episodeCount: integer("episode_count"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("idx_cast_media").on(t.mediaId), index("idx_cast_person").on(t.personId)],
);

export const crewCredits = sqliteTable(
  "crew_credits",
  {
    id: text("id").primaryKey(),
    mediaId: text("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    department: text("department").notNull(),
    job: text("job").notNull(),
    episodeCount: integer("episode_count"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("idx_crew_media").on(t.mediaId), index("idx_crew_person").on(t.personId)],
);

export const episodes = sqliteTable(
  "episodes",
  {
    id: text("id").primaryKey(),
    mediaId: text("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    seasonNumber: integer("season_number").notNull(),
    episodeNumber: integer("episode_number").notNull(),
    name: text("name"),
    runtime: integer("runtime"),
    airDate: text("air_date"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("uq_episode_media_season_number").on(t.mediaId, t.seasonNumber, t.episodeNumber),
    index("idx_episode_media").on(t.mediaId),
  ],
);

export const genres = sqliteTable(
  "genres",
  {
    id: text("id").primaryKey(),
    tmdbId: integer("tmdb_id").notNull(),
    name: text("name").notNull(),
  },
  (t) => [uniqueIndex("uq_genre_tmdb").on(t.tmdbId)],
);

export const mediaGenres = sqliteTable(
  "media_genres",
  {
    id: text("id").primaryKey(),
    mediaId: text("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    genreId: text("genre_id")
      .notNull()
      .references(() => genres.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("uq_media_genre").on(t.mediaId, t.genreId),
    index("idx_media_genre_genre").on(t.genreId),
  ],
);

export const companies = sqliteTable(
  "companies",
  {
    id: text("id").primaryKey(),
    tmdbId: integer("tmdb_id").notNull(),
    kind: text("kind").$type<"company" | "network">().notNull(),
    name: text("name").notNull(),
    logoPath: text("logo_path"),
    originCountry: text("origin_country"),
  },
  (t) => [uniqueIndex("uq_company_kind_tmdb").on(t.kind, t.tmdbId)],
);

export const mediaCompanies = sqliteTable(
  "media_companies",
  {
    id: text("id").primaryKey(),
    mediaId: text("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("uq_media_company").on(t.mediaId, t.companyId),
    index("idx_media_company_company").on(t.companyId),
  ],
);

export const mediaTitles = sqliteTable(
  "media_titles",
  {
    id: text("id").primaryKey(),
    mediaId: text("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    languageCode: text("language_code").notNull(),
    title: text("title").notNull(),
  },
  (t) => [uniqueIndex("uq_media_title_lang").on(t.mediaId, t.languageCode)],
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

export const favoriteMedia = sqliteTable(
  "favorite_media",
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
    uniqueIndex("uq_favorite_media_user_media").on(t.userId, t.mediaId),
    index("idx_favorite_media_user").on(t.userId),
  ],
);

export const favoritePeople = sqliteTable(
  "favorite_people",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("uq_favorite_people_user_person").on(t.userId, t.personId),
    index("idx_favorite_people_user").on(t.userId),
  ],
);
