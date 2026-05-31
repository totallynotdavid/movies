import { describe, expect, it } from "vitest";
import { buildLedger, dayPartPattern, genreTiming, strongestPhase, weekdayPattern } from "./mirror";

describe("weekdayPattern", () => {
  it("counts watches per local weekday and finds the busiest", () => {
    // 2026-01-03 is a Saturday; 2026-01-04 a Sunday; 2026-01-05 a Monday.
    const pattern = weekdayPattern(["2026-01-03", "2026-01-03", "2026-01-04", "2026-01-05"]);

    expect(pattern.totalWatches).toBe(4);
    expect(pattern.busiest).toEqual({ weekday: 6, label: "saturday", watchCount: 2 });
    expect(pattern.weekendShare).toBeCloseTo(3 / 4); // 2 Sat + 1 Sun
    expect(pattern.byWeekday).toHaveLength(7);
    expect(pattern.byWeekday[1].watchCount).toBe(1); // Monday
  });

  it("is empty without activity", () => {
    const pattern = weekdayPattern([]);
    expect(pattern.busiest).toBeNull();
    expect(pattern.weekendShare).toBe(0);
    expect(pattern.totalWatches).toBe(0);
  });
});

describe("dayPartPattern", () => {
  it("buckets by local hour using the stored offset", () => {
    const at = (iso: string) => Date.parse(iso);
    const pattern = dayPartPattern([
      // 02:00 UTC at -300 (EST) is 21:00 local the day before.
      { watchedAt: at("2026-01-15T02:00:00Z"), utcOffsetMinutes: -300 },
      { watchedAt: at("2026-01-16T02:00:00Z"), utcOffsetMinutes: -300 },
      // 03:00 UTC at +0 is 03:00 local — after midnight.
      { watchedAt: at("2026-01-15T03:00:00Z"), utcOffsetMinutes: 0 },
    ]);

    expect(pattern.peakHour).toBe(21);
    expect(pattern.nightOwlShare).toBeCloseTo(1 / 3);
    expect(pattern.totalWatches).toBe(3);
  });
});

describe("genreTiming", () => {
  it("separates weekend genres from weeknight genres", () => {
    const rows = [
      { weekday: 6, genres: ["Comedy"] }, // Saturday
      { weekday: 0, genres: ["Comedy"] }, // Sunday
      { weekday: 6, genres: ["Comedy"] },
      { weekday: 2, genres: ["Comedy"] }, // one weeknight comedy
      { weekday: 2, genres: ["Drama"] }, // Tue
      { weekday: 3, genres: ["Drama"] }, // Wed
      { weekday: 4, genres: ["Drama"] }, // Thu
      { weekday: 1, genres: ["Drama"] }, // Mon
    ];
    const timing = genreTiming(rows);
    expect(timing.weekendGenre?.genre).toBe("Comedy");
    expect(timing.weeknightGenre?.genre).toBe("Drama");
  });

  it("returns nothing when there is no real split", () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({
      weekday: i % 7,
      genres: ["Drama", "Comedy"],
    }));
    expect(genreTiming(rows)).toEqual({ weekendGenre: null, weeknightGenre: null });
  });
});

describe("strongestPhase", () => {
  it("finds a month a genre dominated above its baseline", () => {
    const rows = [
      // March: 6 watches, 5 of them sci-fi → 83% vs a much lower baseline.
      ...Array.from({ length: 5 }, () => ({ month: "2026-03", genres: ["Sci-Fi"] })),
      { month: "2026-03", genres: ["Drama"] },
      // Other months: drama-heavy, little sci-fi → keeps the baseline low.
      ...Array.from({ length: 8 }, () => ({ month: "2026-01", genres: ["Drama"] })),
      ...Array.from({ length: 8 }, () => ({ month: "2026-02", genres: ["Drama"] })),
    ];
    const phase = strongestPhase(rows);
    expect(phase?.month).toBe("2026-03");
    expect(phase?.genre).toBe("Sci-Fi");
    expect(phase?.monthShare).toBeCloseTo(5 / 6);
  });

  it("returns null when nothing dominates", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      month: i < 6 ? "2026-01" : "2026-02",
      genres: ["Drama", "Comedy"],
    }));
    expect(strongestPhase(rows)).toBeNull();
  });
});

describe("buildLedger", () => {
  const day = 24 * 60 * 60 * 1000;
  const now = Date.parse("2026-05-31T00:00:00Z");

  it("counts drops and flags ghosted shows", () => {
    const ledger = buildLedger(
      [
        {
          mediaId: "show-a",
          title: "Show A",
          slug: "show-a",
          status: "watching",
          lastWatchedAt: now - 90 * day, // long stale
          watchedEpisodeCount: 3,
          airedEpisodeCount: 10,
        },
        {
          mediaId: "show-b",
          title: "Show B",
          slug: "show-b",
          status: "watching",
          lastWatchedAt: now - 2 * day, // recent — not ghosted
          watchedEpisodeCount: 1,
          airedEpisodeCount: 10,
        },
        {
          mediaId: "movie-c",
          title: "Movie C",
          slug: "movie-c",
          status: "dropped",
          lastWatchedAt: now - 5 * day,
          watchedEpisodeCount: 0,
          airedEpisodeCount: null,
        },
      ],
      now,
    );

    expect(ledger.droppedCount).toBe(1);
    expect(ledger.ghosted.map((g) => g.mediaId)).toEqual(["show-a"]);
  });

  it("does not flag a fully-watched stale show", () => {
    const ledger = buildLedger(
      [
        {
          mediaId: "show-done",
          title: "Done",
          slug: "done",
          status: "watching",
          lastWatchedAt: now - 200 * day,
          watchedEpisodeCount: 10,
          airedEpisodeCount: 10,
        },
      ],
      now,
    );
    expect(ledger.ghosted).toEqual([]);
  });
});
