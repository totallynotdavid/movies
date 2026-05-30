import { describe, expect, it } from "vitest";
import { buildEpisodeWatch, buildMovieWatch, type Instant } from "./watch-log";
import type { MediaRecord } from "./media";
import type { LibraryEntryRecord } from "./library";

const at: Instant = { watchedAt: 1_717_000_000_000, watchedOn: "2024-05-31" };

function createMedia(input: {
  mediaType: "movie" | "show";
  episodeCount?: number | null;
}): MediaRecord {
  return {
    id: `tmdb:${input.mediaType}:1`,
    tmdbId: 1,
    mediaType: input.mediaType,
    slug: "title-1",
    title: "Title",
    originalTitle: "Title",
    overview: null,
    tagline: null,
    posterPath: null,
    backdropPath: null,
    releaseDate: null,
    lastAirDate: null,
    runtime: null,
    seasonCount: input.mediaType === "show" ? 1 : null,
    episodeCount: input.episodeCount ?? null,
    status: null,
    inProduction: null,
    originalLanguage: null,
    certification: null,
    imdbId: null,
    voteAverage: null,
    voteCount: null,
    popularity: null,
    detailsHydratedAt: null,
    detailsError: null,
    episodesHydratedAt: null,
    episodesError: null,
    createdAt: 1,
    updatedAt: 1,
  };
}

function createEntry(input: Partial<LibraryEntryRecord>): LibraryEntryRecord {
  return {
    id: "entry-1",
    userId: "user-1",
    mediaId: "tmdb:show:1",
    status: "watching",
    score100: null,
    notes: null,
    episodesWatched: 0,
    lastWatchedAt: null,
    createdAt: 1,
    updatedAt: 1,
    ...input,
  };
}

describe("buildMovieWatch", () => {
  it("completes the movie and preserves score/notes", () => {
    const media = createMedia({ mediaType: "movie" });
    const entry = createEntry({
      mediaId: media.id,
      status: "planned",
      score100: 92,
      notes: "soon",
    });

    const result = buildMovieWatch({ userId: "user-1", entry, media, at });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entry.status).toBe("completed");
    expect(result.value.entry.score100).toBe(92);
    expect(result.value.entry.notes).toBe("soon");
    expect(result.value.entry.lastWatchedAt).toBe(at.watchedAt);
    expect(result.value.event.episodeOrdinal).toBeNull();
    expect(result.value.event.watchedOn).toBe("2024-05-31");
  });

  it("rejects a show", () => {
    const result = buildMovieWatch({
      userId: "user-1",
      entry: null,
      media: createMedia({ mediaType: "show", episodeCount: 10 }),
      at,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("wrong_media_type");
  });
});

describe("buildEpisodeWatch", () => {
  it("increments progress and auto-completes at the episode total", () => {
    const media = createMedia({ mediaType: "show", episodeCount: 10 });
    const entry = createEntry({ mediaId: media.id, status: "watching", episodesWatched: 9 });

    const result = buildEpisodeWatch({ userId: "user-1", entry, media, at });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entry.episodesWatched).toBe(10);
    expect(result.value.entry.status).toBe("completed");
    expect(result.value.event.episodeOrdinal).toBe(10);
  });

  it("stays watching before the total and starts a new entry from zero", () => {
    const media = createMedia({ mediaType: "show", episodeCount: 10 });

    const result = buildEpisodeWatch({ userId: "user-1", entry: null, media, at });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entry.episodesWatched).toBe(1);
    expect(result.value.entry.status).toBe("watching");
    expect(result.value.event.episodeOrdinal).toBe(1);
  });

  it("rejects logging past a known episode total", () => {
    const media = createMedia({ mediaType: "show", episodeCount: 10 });
    const entry = createEntry({ mediaId: media.id, episodesWatched: 10 });

    const result = buildEpisodeWatch({ userId: "user-1", entry, media, at });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("already_at_episode_total");
  });

  it("rejects a movie", () => {
    const result = buildEpisodeWatch({
      userId: "user-1",
      entry: null,
      media: createMedia({ mediaType: "movie" }),
      at,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("wrong_media_type");
  });
});
