// Time seam for UTC to local conversion.
//
// This module computes `watchedOn` and `utcOffsetMinutes` at write time from a
// UTC instant. Other modules should consume stored values and avoid timezone
// math.

export type WatchInstant = {
  watchedAt: number;
  watchedOn: string;
  utcOffsetMinutes: number;
};

// Returns local Y-M-D and UTC offset for a UTC instant in an IANA zone. Falls
// back to UTC when the zone is null or invalid.
function localParts(
  watchedAt: number,
  timeZone: string | null,
): { watchedOn: string; utcOffsetMinutes: number } {
  if (!timeZone) {
    return { watchedOn: new Date(watchedAt).toISOString().slice(0, 10), utcOffsetMinutes: 0 };
  }

  try {
    // en-CA renders the date portion as YYYY-MM-DD.
    const dtf = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = dtf.formatToParts(watchedAt);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? "";
    const num = (type: Intl.DateTimeFormatPartTypes) => Number(part(type));

    // Treat the zone wall-clock as UTC. The difference from the real instant is
    // the local offset at watch time.
    const asUtc = Date.UTC(
      num("year"),
      num("month") - 1,
      num("day"),
      num("hour"),
      num("minute"),
      num("second"),
    );
    const utcOffsetMinutes = Math.round((asUtc - Math.floor(watchedAt / 1000) * 1000) / 60000);
    const watchedOn = `${part("year")}-${part("month")}-${part("day")}`;

    return { watchedOn, utcOffsetMinutes };
  } catch {
    return { watchedOn: new Date(watchedAt).toISOString().slice(0, 10), utcOffsetMinutes: 0 };
  }
}

export function instantFor(watchedAt: number, timeZone: string | null): WatchInstant {
  const { watchedOn, utcOffsetMinutes } = localParts(watchedAt, timeZone);
  return { watchedAt, watchedOn, utcOffsetMinutes };
}
