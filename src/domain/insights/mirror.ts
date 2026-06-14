import type { LibraryEntryWithProgress } from "@/domain/tracking/library-entries";
import type { LibraryStatus } from "@/shared/library-status";
import type { WatchHistoryRow } from "@/domain/tracking/watch-history";

const WEEKDAY_LABELS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

// Minimum support and split for weekday genre leaning.
const GENRE_MIN_SUPPORT = 4;
const GENRE_SPLIT_MIN = 0.2;

// A "watching" show untouched for this long, with episodes left, has been ghosted.
const GHOSTED_STALE_MS = 30 * 24 * 60 * 60 * 1000;
const GHOSTED_LIMIT = 4;

// A "phase" is a month a single genre dominated well above its usual share.
const PHASE_MIN_MONTH_WATCHES = 5;
const PHASE_MIN_GENRE_WATCHES = 3;
const PHASE_MONTH_FLOOR = 0.4; // genre must own at least this share of the month
const PHASE_SPIKE_DELTA = 0.2; // minimum lift above all-time baseline share

// Local hours [0,5), after midnight and before dawn.
const NIGHT_START = 0;
const NIGHT_END = 5;

export type WeekdayCount = {
  weekday: number; // 0 = Sunday to 6 = Saturday
  label: string;
  watchCount: number;
};

export type WeekdayPattern = {
  byWeekday: WeekdayCount[]; // always length 7, Sunday-first
  busiest: WeekdayCount | null;
  weekendShare: number; // fraction of watches on Saturday/Sunday
  totalWatches: number;
};

export type DayPartPattern = {
  byHour: number[]; // length 24, local-hour watch counts
  peakHour: number | null;
  nightOwlShare: number; // fraction watched after midnight, before dawn
  totalWatches: number;
};

export type GenreLean = {
  genre: string;
  weekendShare: number;
  watchCount: number;
};

export type GenreTiming = {
  weekendGenre: GenreLean | null;
  weeknightGenre: GenreLean | null;
};

export type GhostedShow = {
  mediaId: string;
  title: string;
  slug: string;
  lastWatchedAt: number;
  watchedEpisodeCount: number;
  airedEpisodeCount: number;
};

export type Ledger = {
  droppedCount: number;
  ghosted: GhostedShow[];
};

export type Phase = {
  month: string; // "YYYY-MM"
  label: string; // "March 2026"
  genre: string;
  watchCount: number; // watches of this genre that month
  monthShare: number; // genre's share of that month's watches
  baselineShare: number; // genre's share across all watches
};

export type Mirror = {
  weekday: WeekdayPattern;
  dayPart: DayPartPattern;
  genreTiming: GenreTiming;
  phase: Phase | null;
  ledger: Ledger;
};

// `watchedOn` is local day [YYYY-MM-DD]. Parsing as UTC midnight and reading
// UTC weekday yields the same local weekday identity.
function weekdayOf(watchedOn: string): number {
  return new Date(`${watchedOn}T00:00:00Z`).getUTCDay();
}

function isWeekend(weekday: number): boolean {
  return weekday === 0 || weekday === 6;
}

export function weekdayPattern(watchedOnDays: string[]): WeekdayPattern {
  const counts = Array.from({ length: 7 }, () => 0);
  for (const day of watchedOnDays) {
    counts[weekdayOf(day)] += 1;
  }

  const byWeekday: WeekdayCount[] = counts.map((watchCount, weekday) => ({
    weekday,
    label: WEEKDAY_LABELS[weekday],
    watchCount,
  }));

  // Strictly-greater keeps the earliest weekday on a tie.
  let busiest: WeekdayCount | null = null;
  for (const day of byWeekday) {
    if (day.watchCount > 0 && (busiest === null || day.watchCount > busiest.watchCount)) {
      busiest = day;
    }
  }

  const total = watchedOnDays.length;
  const weekend = counts[0] + counts[6];

  return {
    byWeekday,
    busiest,
    weekendShare: total > 0 ? weekend / total : 0,
    totalWatches: total,
  };
}

// Shift UTC instant by stored offset, then read UTC hour. This reconstructs the
// local watch hour at event time.
function localHourOf(watchedAt: number, utcOffsetMinutes: number): number {
  return new Date(watchedAt + utcOffsetMinutes * 60_000).getUTCHours();
}

export function dayPartPattern(
  events: { watchedAt: number; utcOffsetMinutes: number }[],
): DayPartPattern {
  const byHour = Array.from({ length: 24 }, () => 0);
  for (const event of events) {
    byHour[localHourOf(event.watchedAt, event.utcOffsetMinutes)] += 1;
  }

  let peakHour: number | null = null;
  for (let hour = 0; hour < 24; hour += 1) {
    if (byHour[hour] > 0 && (peakHour === null || byHour[hour] > byHour[peakHour])) {
      peakHour = hour;
    }
  }

  const total = events.length;
  let night = 0;
  for (let hour = NIGHT_START; hour < NIGHT_END; hour += 1) night += byHour[hour];

  return {
    byHour,
    peakHour,
    nightOwlShare: total > 0 ? night / total : 0,
    totalWatches: total,
  };
}

export function genreTiming(rows: { weekday: number; genres: string[] }[]): GenreTiming {
  const stats = new Map<string, { weekend: number; total: number }>();
  for (const row of rows) {
    const weekend = isWeekend(row.weekday);
    for (const genre of row.genres) {
      const current = stats.get(genre) ?? { weekend: 0, total: 0 };
      current.total += 1;
      if (weekend) current.weekend += 1;
      stats.set(genre, current);
    }
  }

  const qualified = [...stats.entries()]
    .filter(([, s]) => s.total >= GENRE_MIN_SUPPORT)
    .map(([genre, s]) => ({ genre, weekendShare: s.weekend / s.total, watchCount: s.total }))
    .sort((a, b) => b.weekendShare - a.weekendShare || b.watchCount - a.watchCount);

  if (qualified.length < 2) return { weekendGenre: null, weeknightGenre: null };

  const weekendGenre = qualified[0];
  const weeknightGenre = qualified[qualified.length - 1];

  // Only a pattern if the two genres genuinely split across the week.
  if (weekendGenre.weekendShare - weeknightGenre.weekendShare < GENRE_SPLIT_MIN) {
    return { weekendGenre: null, weeknightGenre: null };
  }

  return { weekendGenre, weeknightGenre };
}

function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, m - 1, 1)));
}

// Finds the month where one genre most exceeded its all-time baseline.
// Returns null when thresholds are not met.
export function strongestPhase(rows: { month: string; genres: string[] }[]): Phase | null {
  const overall = new Map<string, number>();
  const months = new Map<string, { total: number; genres: Map<string, number> }>();
  let overallTotal = 0;

  for (const row of rows) {
    overallTotal += 1;
    const month = months.get(row.month) ?? { total: 0, genres: new Map<string, number>() };
    month.total += 1;
    for (const genre of row.genres) {
      overall.set(genre, (overall.get(genre) ?? 0) + 1);
      month.genres.set(genre, (month.genres.get(genre) ?? 0) + 1);
    }
    months.set(row.month, month);
  }
  if (overallTotal === 0) return null;

  let best: Phase | null = null;
  let bestLift = -Infinity;
  for (const [month, data] of months) {
    if (data.total < PHASE_MIN_MONTH_WATCHES) continue;
    for (const [genre, count] of data.genres) {
      if (count < PHASE_MIN_GENRE_WATCHES) continue;
      const monthShare = count / data.total;
      if (monthShare < PHASE_MONTH_FLOOR) continue;

      const baselineShare = (overall.get(genre) ?? 0) / overallTotal;
      const lift = monthShare - baselineShare;
      if (lift < PHASE_SPIKE_DELTA) continue;

      const wins =
        lift > bestLift ||
        (lift === bestLift &&
          best !== null &&
          (count > best.watchCount || (count === best.watchCount && month > best.month)));
      if (best === null || wins) {
        best = {
          month,
          label: monthLabel(month),
          genre,
          watchCount: count,
          monthShare,
          baselineShare,
        };
        bestLift = lift;
      }
    }
  }
  return best;
}

type LedgerEntry = {
  mediaId: string;
  title: string;
  slug: string;
  status: LibraryStatus;
  lastWatchedAt: number | null;
  watchedEpisodeCount: number;
  airedEpisodeCount: number | null;
};

export function buildLedger(entries: LedgerEntry[], now: number): Ledger {
  const ghosted: GhostedShow[] = [];
  let droppedCount = 0;

  for (const entry of entries) {
    if (entry.status === "dropped") {
      droppedCount += 1;
      continue;
    }

    const stale =
      entry.status === "watching" &&
      entry.lastWatchedAt !== null &&
      now - entry.lastWatchedAt > GHOSTED_STALE_MS &&
      entry.airedEpisodeCount !== null &&
      entry.watchedEpisodeCount < entry.airedEpisodeCount;

    if (stale) {
      ghosted.push({
        mediaId: entry.mediaId,
        title: entry.title,
        slug: entry.slug,
        lastWatchedAt: entry.lastWatchedAt!,
        watchedEpisodeCount: entry.watchedEpisodeCount,
        airedEpisodeCount: entry.airedEpisodeCount!,
      });
    }
  }

  // Most stale first.
  ghosted.sort((a, b) => a.lastWatchedAt - b.lastWatchedAt);

  return { droppedCount, ghosted: ghosted.slice(0, GHOSTED_LIMIT) };
}

export function buildMirror(
  history: WatchHistoryRow[],
  genresByMedia: Map<string, string[]>,
  entries: LibraryEntryWithProgress[],
  now: number,
): Mirror {
  const genreRows = history.map((row) => ({
    weekday: weekdayOf(row.watchedOn),
    month: row.watchedOn.slice(0, 7),
    genres: genresByMedia.get(row.mediaId) ?? [],
  }));

  const ledger = buildLedger(
    entries.map((entry) => ({
      mediaId: entry.mediaId,
      title: entry.media.title,
      slug: entry.media.slug,
      status: entry.status,
      lastWatchedAt: entry.lastWatchedAt,
      watchedEpisodeCount: entry.watchedEpisodeCount,
      airedEpisodeCount: entry.airedEpisodeCount,
    })),
    now,
  );

  return {
    weekday: weekdayPattern(history.map((row) => row.watchedOn)),
    dayPart: dayPartPattern(history),
    genreTiming: genreTiming(genreRows),
    phase: strongestPhase(genreRows),
    ledger,
  };
}
