import { describe, expect, it } from "vite-plus/test";
import { instantFor } from "./instant";

describe("instantFor", () => {
  it.each([
    {
      name: "falls back to UTC when no timezone is set",
      at: "2024-01-15T23:30:00Z",
      zone: null,
      watchedOn: "2024-01-15",
      utcOffsetMinutes: 0,
    },
    {
      name: "falls back to UTC for an unknown timezone",
      at: "2024-01-15T23:30:00Z",
      zone: "Not/AZone",
      watchedOn: "2024-01-15",
      utcOffsetMinutes: 0,
    },
    {
      name: "stamps the local day and offset for a zone",
      at: "2024-01-15T12:00:00Z",
      zone: "America/New_York",
      watchedOn: "2024-01-15",
      utcOffsetMinutes: -300,
    },
    {
      name: "rolls the local day back when the instant is past midnight UTC but not local",
      at: "2024-01-15T02:00:00Z",
      zone: "America/New_York",
      watchedOn: "2024-01-14",
      utcOffsetMinutes: -300,
    },
  ])("$name", ({ at, zone, watchedOn, utcOffsetMinutes }) => {
    expect(instantFor(Date.parse(at), zone)).toEqual({
      watchedAt: Date.parse(at),
      watchedOn,
      utcOffsetMinutes,
    });
  });
});
