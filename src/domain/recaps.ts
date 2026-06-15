import type { ProfileIdentity } from "@/domain/user";

export type RecapAccess = "open" | "locked" | "not_available";

export type RecapYear = {
  year: number;
  access: Exclude<RecapAccess, "not_available">;
};

// Invalid or missing IANA zones fall back to UTC.
function zonedYearMonth(today: Date, timeZone: string | null): { year: number; month: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone ?? "UTC",
      year: "numeric",
      month: "numeric",
    }).formatToParts(today);
    return {
      year: Number(parts.find((p) => p.type === "year")?.value),
      month: Number(parts.find((p) => p.type === "month")?.value),
    };
  } catch {
    return { year: today.getUTCFullYear(), month: today.getUTCMonth() + 1 };
  }
}

// Which year a bare wrapped view should default to. During January we surface the
// just-completed year instead of a near-empty current year.
export function resolveWrappedYear(today: Date, timeZone: string | null): number {
  const { year, month } = zonedYearMonth(today, timeZone);
  return month === 1 ? year - 1 : year;
}

export function recapAccessForYear(input: {
  year: number;
  currentYear: number;
  currentMonth: number;
  owner: boolean;
  hasActivity: boolean;
}): RecapAccess {
  const { year, currentYear, currentMonth, owner, hasActivity } = input;

  if (year > currentYear) return "not_available";

  if (owner) {
    return year === currentYear || hasActivity ? "open" : "not_available";
  }

  if (year < currentYear) {
    return hasActivity ? "open" : "not_available";
  }

  if (currentMonth < 12) return "locked";
  return hasActivity ? "open" : "not_available";
}

export function buildRecapYears(input: {
  activityYears: number[];
  profile: ProfileIdentity;
  owner: boolean;
  today: Date;
}): RecapYear[] {
  const { activityYears, profile, owner, today } = input;
  const { year: currentYear, month: currentMonth } = zonedYearMonth(today, profile.timeZone);
  const activity = new Set(activityYears);
  const years = new Set([...activity, currentYear]);

  return [...years]
    .sort((a, b) => b - a)
    .map((year) => ({
      year,
      access: recapAccessForYear({
        year,
        currentYear,
        currentMonth,
        owner,
        hasActivity: activity.has(year),
      }),
    }))
    .filter((recap): recap is RecapYear => recap.access !== "not_available");
}
