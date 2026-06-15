import { describe, expect, it } from "vitest";
import type { ProfileIdentity } from "@/domain/user";
import { buildRecapYears, recapAccessForYear } from "./recaps";

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
  it("never exposes future years", () => {
    expect(
      recapAccessForYear({
        year: 2027,
        currentYear: 2026,
        currentMonth: 12,
        owner: true,
        hasActivity: true,
      }),
    ).toBe("not_available");
  });

  it("lets owners open the current year without activity", () => {
    expect(
      recapAccessForYear({
        year: 2026,
        currentYear: 2026,
        currentMonth: 6,
        owner: true,
        hasActivity: false,
      }),
    ).toBe("open");
  });

  it("locks the public current year before December", () => {
    expect(
      recapAccessForYear({
        year: 2026,
        currentYear: 2026,
        currentMonth: 6,
        owner: false,
        hasActivity: true,
      }),
    ).toBe("locked");
  });

  it("opens the public current year in December only when activity exists", () => {
    expect(
      recapAccessForYear({
        year: 2026,
        currentYear: 2026,
        currentMonth: 12,
        owner: false,
        hasActivity: true,
      }),
    ).toBe("open");
    expect(
      recapAccessForYear({
        year: 2026,
        currentYear: 2026,
        currentMonth: 12,
        owner: false,
        hasActivity: false,
      }),
    ).toBe("not_available");
  });
});

describe("buildRecapYears", () => {
  it("lets owners open the current year even without activity", () => {
    const years = buildRecapYears({
      activityYears: [2025],
      profile,
      owner: true,
      today: new Date("2026-06-15T12:00:00Z"),
    });

    expect(years).toEqual([
      { year: 2026, access: "open" },
      { year: 2025, access: "open" },
    ]);
  });

  it("locks the public current year before December", () => {
    const years = buildRecapYears({
      activityYears: [2025],
      profile,
      owner: false,
      today: new Date("2026-06-15T12:00:00Z"),
    });

    expect(years).toEqual([
      { year: 2026, access: "locked" },
      { year: 2025, access: "open" },
    ]);
  });

  it("opens public current-year recaps in December when activity exists", () => {
    const years = buildRecapYears({
      activityYears: [2026, 2025],
      profile,
      owner: false,
      today: new Date("2026-12-01T00:00:00Z"),
    });

    expect(years).toEqual([
      { year: 2026, access: "open" },
      { year: 2025, access: "open" },
    ]);
  });

  it("filters future activity years", () => {
    const years = buildRecapYears({
      activityYears: [2027, 2025],
      profile,
      owner: false,
      today: new Date("2026-06-15T12:00:00Z"),
    });

    expect(years).toEqual([
      { year: 2026, access: "locked" },
      { year: 2025, access: "open" },
    ]);
  });
});
