import { describe, expect, it } from "vite-plus/test";
import type { ProfileIdentity } from "@/domain/user";
import { buildRecapYears, recapAccessForYear, resolveWrappedYear } from "./recaps";

const profile: ProfileIdentity = {
  id: "user-1",
  username: "dubu",
  displayName: "Dubu",
  avatarEmoji: null,
  avatarColor: null,
  joinedAt: 0,
  timeZone: "UTC",
  visibility: "public",
};

describe("recapAccessForYear", () => {
  it.each([
    {
      name: "never exposes future years",
      input: { year: 2027, currentYear: 2026, currentMonth: 12, owner: true, hasActivity: true },
      expected: "not_available",
    },
    {
      name: "lets owners open the current year without activity",
      input: { year: 2026, currentYear: 2026, currentMonth: 6, owner: true, hasActivity: false },
      expected: "open",
    },
    {
      name: "locks the public current year before December",
      input: { year: 2026, currentYear: 2026, currentMonth: 6, owner: false, hasActivity: true },
      expected: "locked",
    },
    {
      name: "opens the public current year in December when activity exists",
      input: { year: 2026, currentYear: 2026, currentMonth: 12, owner: false, hasActivity: true },
      expected: "open",
    },
    {
      name: "hides the public current year in December without activity",
      input: { year: 2026, currentYear: 2026, currentMonth: 12, owner: false, hasActivity: false },
      expected: "not_available",
    },
  ])("$name", ({ input, expected }) => {
    expect(recapAccessForYear(input)).toBe(expected);
  });
});

describe("buildRecapYears", () => {
  it.each([
    {
      name: "lets owners open the current year even without activity",
      activityYears: [2025],
      owner: true,
      today: "2026-06-15T12:00:00Z",
      expected: [
        { year: 2026, access: "open" },
        { year: 2025, access: "open" },
      ],
    },
    {
      name: "locks the public current year before December",
      activityYears: [2025],
      owner: false,
      today: "2026-06-15T12:00:00Z",
      expected: [
        { year: 2026, access: "locked" },
        { year: 2025, access: "open" },
      ],
    },
    {
      name: "opens public current-year recaps in December when activity exists",
      activityYears: [2026, 2025],
      owner: false,
      today: "2026-12-01T00:00:00Z",
      expected: [
        { year: 2026, access: "open" },
        { year: 2025, access: "open" },
      ],
    },
    {
      name: "filters future activity years",
      activityYears: [2027, 2025],
      owner: false,
      today: "2026-06-15T12:00:00Z",
      expected: [
        { year: 2026, access: "locked" },
        { year: 2025, access: "open" },
      ],
    },
  ])("$name", ({ activityYears, owner, today, expected }) => {
    expect(buildRecapYears({ activityYears, profile, owner, today: new Date(today) })).toEqual(
      expected,
    );
  });
});

describe("resolveWrappedYear", () => {
  it.each([
    {
      name: "defaults to the current year in the user's zone",
      now: "2026-05-30T12:00:00Z",
      zone: "UTC",
      expected: 2026,
    },
    {
      name: "surfaces the just-completed year during the January grace window",
      now: "2026-01-15T12:00:00Z",
      zone: "UTC",
      expected: 2025,
    },
    {
      // 23:30 UTC on Dec 31 is already January in Tokyo (UTC+9).
      name: "resolves the year in the user's timezone at the boundary",
      now: "2026-12-31T23:30:00Z",
      zone: "Asia/Tokyo",
      expected: 2026,
    },
    {
      name: "falls back to UTC for an unknown timezone",
      now: "2026-01-15T12:00:00Z",
      zone: "Not/AZone",
      expected: 2025,
    },
  ])("$name", ({ now, zone, expected }) => {
    expect(resolveWrappedYear(new Date(now), zone)).toBe(expected);
  });
});
