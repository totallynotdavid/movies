import { describe, expect, it } from "vitest";
import { instantFor } from "./instant";

describe("instantFor", () => {
  it("falls back to UTC when no timezone is set", () => {
    const result = instantFor(Date.parse("2024-01-15T23:30:00Z"), null);
    expect(result.watchedOn).toBe("2024-01-15");
    expect(result.utcOffsetMinutes).toBe(0);
  });

  it("stamps the local day and offset for a zone", () => {
    const result = instantFor(Date.parse("2024-01-15T12:00:00Z"), "America/New_York");
    expect(result.watchedOn).toBe("2024-01-15");
    expect(result.utcOffsetMinutes).toBe(-300); // EST = UTC-5
  });

  it("rolls the local day back when the instant is past midnight UTC but not local", () => {
    // 02:00 UTC is 21:00 the previous day in New York.
    const result = instantFor(Date.parse("2024-01-15T02:00:00Z"), "America/New_York");
    expect(result.watchedOn).toBe("2024-01-14");
    expect(result.utcOffsetMinutes).toBe(-300);
  });
});
