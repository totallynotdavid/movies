import { describe, expect, it } from "vitest";
import {
  buildActivityCalendar,
  buildMovieWatchUpdate,
  buildProfileFormatStats,
  buildShowEpisodeUpdate,
  sortProfileActivity,
} from "./activity";

function createMediaRecord(input: {
  id: string;
  mediaType: "movie" | "show";
  title: string;
  episodeCount?: number | null;
}) {
  return {
    id: input.id,
    mediaType: input.mediaType,
    provider: "tmdb",
    providerId: 1,
    slug: input.title.toLowerCase().replace(/\s+/g, "-"),
    title: input.title,
    originalTitle: input.title,
    overview: null,
    posterPath: null,
    backdropPath: null,
    releaseDate: null,
    seasonCount: input.mediaType === "show" ? 1 : null,
    episodeCount: input.episodeCount ?? null,
    voteAverage: null,
    voteCount: null,
    popularity: null,
    createdAt: 1,
    updatedAt: 1,
  };
}

function createLibraryEntry(input: {
  userId: string;
  mediaId: string;
  status: "planned" | "watching" | "completed" | "paused" | "dropped";
  score100?: number | null;
  progressCurrent?: number;
  progressTotal?: number | null;
  notes?: string | null;
}) {
  return {
    id: `${input.userId}:${input.mediaId}`,
    userId: input.userId,
    mediaId: input.mediaId,
    status: input.status,
    score100: input.score100 ?? null,
    progressCurrent: input.progressCurrent ?? 0,
    progressTotal: input.progressTotal ?? null,
    notes: input.notes ?? null,
    updatedAt: 1,
  };
}

describe("activity domain", () => {
  it("logs a movie watch while preserving the current snapshot details", () => {
    const mediaRecord = createMediaRecord({
      id: "tmdb:movie:1",
      mediaType: "movie",
      title: "Arrival",
    });
    const existingEntry = createLibraryEntry({
      userId: "user-1",
      mediaId: mediaRecord.id,
      status: "planned",
      score100: 92,
      notes: "rewatch soon",
    });

    const update = buildMovieWatchUpdate({
      existingEntry,
      mediaRecord,
      watch: {
        userId: "user-1",
        mediaId: mediaRecord.id,
        occurredAt: 1_717_000_000_000,
        occurredOn: "2024-05-31",
      },
    });

    expect(update.entry.status).toBe("completed");
    expect(update.entry.score100).toBe(92);
    expect(update.entry.notes).toBe("rewatch soon");
    expect(update.event.kind).toBe("movie_watched");
    expect(update.event.occurredOn).toBe("2024-05-31");
  });

  it("increments show progress and auto-completes when the total is reached", () => {
    const mediaRecord = createMediaRecord({
      id: "tmdb:show:1",
      mediaType: "show",
      title: "Severance",
      episodeCount: 10,
    });
    const existingEntry = createLibraryEntry({
      userId: "user-1",
      mediaId: mediaRecord.id,
      status: "watching",
      progressCurrent: 9,
      progressTotal: 10,
    });

    const update = buildShowEpisodeUpdate({
      existingEntry,
      mediaRecord,
      watch: {
        userId: "user-1",
        mediaId: mediaRecord.id,
        occurredAt: 1_717_000_100_000,
        occurredOn: "2024-05-31",
      },
    });

    expect(update.entry.progressCurrent).toBe(10);
    expect(update.entry.status).toBe("completed");
    expect(update.event.kind).toBe("episode_watched");
    expect(update.event.episodeNumber).toBe(10);
  });

  it("aggregates profile stats by media type with distinct watch days", () => {
    const stats = buildProfileFormatStats(
      [
        { mediaType: "movie", score100: 80 },
        { mediaType: "movie", score100: null },
        { mediaType: "show", score100: 90 },
        { mediaType: "show", score100: 70 },
      ],
      [
        { mediaType: "movie", occurredOn: "2024-05-30" },
        { mediaType: "movie", occurredOn: "2024-05-30" },
        { mediaType: "movie", occurredOn: "2024-05-31" },
        { mediaType: "show", occurredOn: "2024-05-31" },
      ],
    );

    expect(stats.movie).toEqual({
      tracked: 2,
      watchDays: 2,
      averageScore100: 80,
    });
    expect(stats.show).toEqual({
      tracked: 2,
      watchDays: 1,
      averageScore100: 80,
    });
  });

  it("zero-fills the calendar and keeps the feed in reverse chronological order", () => {
    const calendar = buildActivityCalendar(
      [
        { occurredOn: "2024-05-29", count: 2 },
        { occurredOn: "2024-05-31", count: 1 },
      ],
      4,
      new Date("2024-05-31T12:00:00Z"),
    );
    const ordered = sortProfileActivity([
      { occurredAt: 20, id: "middle" },
      { occurredAt: 10, id: "oldest" },
      { occurredAt: 30, id: "newest" },
    ]);

    expect(calendar).toEqual([
      { date: "2024-05-28", count: 0 },
      { date: "2024-05-29", count: 2 },
      { date: "2024-05-30", count: 0 },
      { date: "2024-05-31", count: 1 },
    ]);
    expect(ordered.map((item) => item.id)).toEqual(["newest", "middle", "oldest"]);
  });
});
