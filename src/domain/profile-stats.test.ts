import { describe, expect, it } from "vitest";
import { buildActivityCalendar, buildProfileFormatStats, calendarStartDate } from "./profile-stats";

describe("buildProfileFormatStats", () => {
  it("aggregates by media type with distinct watch days and average score", () => {
    const stats = buildProfileFormatStats(
      [
        { mediaType: "movie", score100: 80 },
        { mediaType: "movie", score100: null },
        { mediaType: "show", score100: 90 },
        { mediaType: "show", score100: 70 },
      ],
      [
        { mediaType: "movie", watchedOn: "2024-05-30" },
        { mediaType: "movie", watchedOn: "2024-05-30" },
        { mediaType: "movie", watchedOn: "2024-05-31" },
        { mediaType: "show", watchedOn: "2024-05-31" },
      ],
    );

    expect(stats.movie).toEqual({ tracked: 2, watchDays: 2, averageScore100: 80 });
    expect(stats.show).toEqual({ tracked: 2, watchDays: 1, averageScore100: 80 });
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
