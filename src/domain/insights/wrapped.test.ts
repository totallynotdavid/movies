import { describe, expect, it } from "vitest";
import { buildWrappedSummary, wrappedWindowStartDate } from "./wrapped";

describe("wrappedWindowStartDate", () => {
  it("starts the recap at the beginning of the current UTC year", () => {
    expect(wrappedWindowStartDate(new Date("2026-05-30T12:00:00Z"))).toBe("2026-01-01");
  });
});

describe("buildWrappedSummary", () => {
  it("aggregates minutes, formats, people, and genres from watch activity", () => {
    const wrapped = buildWrappedSummary(
      {
        watchRows: [
          {
            id: "e1",
            mediaId: "movie-a",
            mediaType: "movie",
            title: "Movie A",
            slug: "movie-a",
            posterPath: "/movie-a.jpg",
            releaseDate: "2024-01-01",
            runtime: 120,
            score100: 95,
            watchedAt: 0,
            watchedOn: "2026-01-02",
            utcOffsetMinutes: 0,
            seasonNumber: null,
            episodeNumber: null,
          },
          {
            id: "e2",
            mediaId: "movie-a",
            mediaType: "movie",
            title: "Movie A",
            slug: "movie-a",
            posterPath: "/movie-a.jpg",
            releaseDate: "2024-01-01",
            runtime: 120,
            score100: 95,
            watchedAt: 0,
            watchedOn: "2026-01-03",
            utcOffsetMinutes: 0,
            seasonNumber: null,
            episodeNumber: null,
          },
          {
            id: "e3",
            mediaId: "show-b",
            mediaType: "show",
            title: "Show B",
            slug: "show-b",
            posterPath: "/show-b.jpg",
            releaseDate: "2025-02-02",
            runtime: null,
            score100: 88,
            watchedAt: 0,
            watchedOn: "2026-01-03",
            utcOffsetMinutes: 0,
            seasonNumber: 1,
            episodeNumber: 1,
          },
          {
            id: "e4",
            mediaId: "show-b",
            mediaType: "show",
            title: "Show B",
            slug: "show-b",
            posterPath: "/show-b.jpg",
            releaseDate: "2025-02-02",
            runtime: null,
            score100: 88,
            watchedAt: 0,
            watchedOn: "2026-01-04",
            utcOffsetMinutes: 0,
            seasonNumber: 1,
            episodeNumber: 2,
          },
          {
            id: "e5",
            mediaId: "movie-c",
            mediaType: "movie",
            title: "Movie C",
            slug: "movie-c",
            posterPath: "/movie-c.jpg",
            releaseDate: "2020-03-03",
            runtime: 90,
            score100: 70,
            watchedAt: 0,
            watchedOn: "2026-01-04",
            utcOffsetMinutes: 0,
            seasonNumber: null,
            episodeNumber: null,
          },
        ],
        episodeRows: [
          { mediaId: "show-b", seasonNumber: 1, episodeNumber: 1, runtime: 50 },
          { mediaId: "show-b", seasonNumber: 1, episodeNumber: 2, runtime: 45 },
        ],
        genresByMedia: new Map([
          ["movie-a", ["Drama", "Thriller"]],
          ["show-b", ["Drama", "Sci-Fi"]],
          ["movie-c", ["Comedy"]],
        ]),
        castRows: [
          {
            id: "c1",
            mediaId: "movie-a",
            personId: "actor-1",
            name: "Actor One",
            slug: "actor-one",
            profilePath: "/actor-1.jpg",
            character: "Lead",
            billingOrder: 1,
            episodeCount: null,
          },
          {
            id: "c2",
            mediaId: "movie-a",
            personId: "actor-2",
            name: "Actor Two",
            slug: "actor-two",
            profilePath: "/actor-2.jpg",
            character: "Support",
            billingOrder: 2,
            episodeCount: null,
          },
          {
            id: "c3",
            mediaId: "show-b",
            personId: "actor-1",
            name: "Actor One",
            slug: "actor-one",
            profilePath: "/actor-1.jpg",
            character: "Guest",
            billingOrder: 2,
            episodeCount: 2,
          },
          {
            id: "c4",
            mediaId: "show-b",
            personId: "actor-3",
            name: "Actor Three",
            slug: "actor-three",
            profilePath: "/actor-3.jpg",
            character: "Lead",
            billingOrder: 1,
            episodeCount: 2,
          },
        ],
        crewRows: [
          {
            id: "w1",
            mediaId: "movie-a",
            personId: "director-1",
            name: "Director One",
            slug: "director-one",
            profilePath: "/director-1.jpg",
            department: "Directing",
            job: "Director",
            episodeCount: null,
          },
          {
            id: "w2",
            mediaId: "movie-a",
            personId: "writer-1",
            name: "Writer One",
            slug: "writer-one",
            profilePath: "/writer-1.jpg",
            department: "Writing",
            job: "Writer",
            episodeCount: null,
          },
          {
            id: "w3",
            mediaId: "show-b",
            personId: "creator-1",
            name: "Creator One",
            slug: "creator-one",
            profilePath: "/creator-1.jpg",
            department: "Writing",
            job: "Creator",
            episodeCount: 2,
          },
          {
            id: "w4",
            mediaId: "show-b",
            personId: "composer-1",
            name: "Composer One",
            slug: "composer-one",
            profilePath: "/composer-1.jpg",
            department: "Sound",
            job: "Original Music Composer",
            episodeCount: 2,
          },
        ],
      },
      new Date("2026-05-30T12:00:00Z"),
    );

    expect(wrapped.totalMinutes).toBe(425);
    expect(wrapped.totalWatchCount).toBe(5);
    expect(wrapped.watchDays).toBe(3);
    expect(wrapped.longestStreak).toBe(3);
    expect(wrapped.busiestDay).toEqual({ date: "2026-01-03", minutes: 170, watchCount: 2 });

    expect(wrapped.formatBreakdown).toEqual([
      expect.objectContaining({ mediaType: "movie", minutes: 330, watchCount: 3 }),
      expect.objectContaining({ mediaType: "show", minutes: 95, watchCount: 2 }),
    ]);
    expect(wrapped.formatBreakdown[0]?.share).toBeCloseTo(330 / 425);
    expect(wrapped.formatBreakdown[1]?.share).toBeCloseTo(95 / 425);

    expect(wrapped.topTitles.map((title) => title.title)).toEqual(["Movie A", "Show B", "Movie C"]);
    expect(wrapped.topTitles[0]).toEqual(
      expect.objectContaining({ minutes: 240, watchCount: 2, score100: 95 }),
    );

    expect(wrapped.topGenres.map((genre) => genre.name)).toEqual([
      "Drama",
      "Thriller",
      "Comedy",
      "Sci-Fi",
    ]);
    expect(wrapped.topGenres[0]).toEqual(
      expect.objectContaining({ minutes: 167.5, watchCount: 4 }),
    );

    expect(wrapped.topActors[0]).toEqual(
      expect.objectContaining({
        name: "Actor One",
        minutes: 167.5,
        watchCount: 4,
        titleCount: 2,
      }),
    );

    expect(wrapped.topDirectors[0]).toEqual(
      expect.objectContaining({
        name: "Director One",
        minutes: 240,
        subtitle: "director",
      }),
    );
    expect(wrapped.topCrew[0]).toEqual(
      expect.objectContaining({
        name: "Writer One",
        minutes: 240,
        subtitle: "writer",
      }),
    );
  });

  it("returns an empty wrapped state without watch activity", () => {
    const wrapped = buildWrappedSummary(
      {
        watchRows: [],
        episodeRows: [],
        genresByMedia: new Map(),
        castRows: [],
        crewRows: [],
      },
      new Date("2026-05-30T12:00:00Z"),
    );

    expect(wrapped.totalMinutes).toBe(0);
    expect(wrapped.totalWatchCount).toBe(0);
    expect(wrapped.topTitles).toEqual([]);
    expect(wrapped.busiestDay).toBeNull();
  });
});
