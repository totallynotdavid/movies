import { describe, expect, it } from "vitest";
import { buildActivityCalendar, buildProfileStats, calendarStartDate } from "./profile";

describe("buildProfileStats", () => {
  it("splits by format and combines totals without double-counting cross-format days", () => {
    const stats = buildProfileStats(
      [
        { mediaType: "movie", score100: 80 },
        { mediaType: "movie", score100: null },
        { mediaType: "show", score100: 90 },
      ],
      [
        // 2024-05-31 has both a movie and a show watch; the combined total counts it
        // once, while each per-format bucket counts its own day.
        { mediaType: "movie", watchedOn: "2024-05-31" },
        { mediaType: "show", watchedOn: "2024-05-31" },
        { mediaType: "movie", watchedOn: "2024-06-01" },
      ],
    );

    expect(stats.byFormat.movie).toEqual({ tracked: 2, watchDays: 2, averageScore100: 80 });
    expect(stats.byFormat.show).toEqual({ tracked: 1, watchDays: 1, averageScore100: 90 });

    expect(stats.tracked).toBe(3);
    expect(stats.watchDays).toBe(2); // 2024-05-31 counted once across formats
    expect(stats.averageScore100).toBe(85); // (80 + 90) / 2, over rated rows only
  });

  it("reports null averages when nothing is rated", () => {
    const stats = buildProfileStats([{ mediaType: "movie", score100: null }], []);

    expect(stats.tracked).toBe(1);
    expect(stats.watchDays).toBe(0);
    expect(stats.averageScore100).toBeNull();
    expect(stats.byFormat.movie.averageScore100).toBeNull();
  });
});

describe("calendarStartDate", () => {
  it("returns the inclusive first day of the window", () => {
    expect(calendarStartDate(4, new Date("2024-05-31T12:00:00Z"))).toBe("2024-05-28");
  });
});

describe("buildActivityCalendar", () => {
  it("zero-fills the window and counts one per raw watch row", () => {
    const calendar = buildActivityCalendar(
      [{ watchedOn: "2024-05-29" }, { watchedOn: "2024-05-29" }, { watchedOn: "2024-05-31" }],
      4,
      new Date("2024-05-31T12:00:00Z"),
    );

    expect(calendar).toEqual([
      { date: "2024-05-28", count: 0 },
      { date: "2024-05-29", count: 2 },
      { date: "2024-05-30", count: 0 },
      { date: "2024-05-31", count: 1 },
    ]);
  });
});
