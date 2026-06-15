import type { MediaType } from "@/domain/catalog/media";

type FormatStatsSource = {
  mediaType: MediaType;
  score100: number | null;
};

type WatchDaySource = {
  mediaType: MediaType;
  watchedOn: string;
};

type CalendarSource = {
  watchedOn: string;
};

type ProfileActivitySource = {
  id: string;
  mediaId: string;
  mediaType: MediaType;
  title: string;
  slug: string;
  watchedAt: number;
  watchedOn: string;
  seasonNumber: number | null;
  episodeNumber: number | null;
};

export type ProfileFormatStat = {
  tracked: number;
  watchDays: number;
  averageScore100: number | null;
};

// Headline numbers plus the per-format split, from one pass over the rows. The
// totals are NOT sums of the per-format values: watch days are distinct across
// formats (a day with both a movie and a show counts once), and the average is
// over all rated rows, not an average of two averages. Both fall out of the same
// tallies the per-format buckets are built from, so a single pass owns all of it.
export type ProfileStats = {
  tracked: number;
  watchDays: number;
  averageScore100: number | null;
  byFormat: Record<MediaType, ProfileFormatStat>;
};

export type ProfileCalendarDay = {
  date: string;
  count: number;
};

// Day-level by design: the feed exposes `watchedOn` (a calendar day) and never a
// timestamp, so the same shape is safe to render on a public profile.
export type ProfileActivityItem = {
  id: string;
  mediaId: string;
  mediaType: MediaType;
  title: string;
  slug: string;
  watchedOn: string;
  seasonNumber: number | null;
  episodeNumber: number | null;
};

export type ProfileActivity = {
  calendar: ProfileCalendarDay[];
  recent: ProfileActivityItem[];
};

function average(sum: number, count: number): number | null {
  return count > 0 ? sum / count : null;
}

export function buildProfileStats(
  libraryRows: FormatStatsSource[],
  watchRows: WatchDaySource[],
): ProfileStats {
  const tally = {
    movie: { tracked: 0, days: new Set<string>(), sum: 0, count: 0 },
    show: { tracked: 0, days: new Set<string>(), sum: 0, count: 0 },
  };

  for (const row of libraryRows) {
    const bucket = tally[row.mediaType];
    bucket.tracked += 1;
    if (row.score100 !== null) {
      bucket.sum += row.score100;
      bucket.count += 1;
    }
  }

  for (const row of watchRows) {
    tally[row.mediaType].days.add(row.watchedOn);
  }

  const byFormat: Record<MediaType, ProfileFormatStat> = {
    movie: {
      tracked: tally.movie.tracked,
      watchDays: tally.movie.days.size,
      averageScore100: average(tally.movie.sum, tally.movie.count),
    },
    show: {
      tracked: tally.show.tracked,
      watchDays: tally.show.days.size,
      averageScore100: average(tally.show.sum, tally.show.count),
    },
  };

  const distinctDays = new Set<string>([...tally.movie.days, ...tally.show.days]);

  return {
    tracked: tally.movie.tracked + tally.show.tracked,
    watchDays: distinctDays.size,
    averageScore100: average(
      tally.movie.sum + tally.show.sum,
      tally.movie.count + tally.show.count,
    ),
    byFormat,
  };
}

export function calendarStartDate(days: number, today = new Date()): string {
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  end.setUTCDate(end.getUTCDate() - (days - 1));
  return end.toISOString().slice(0, 10);
}

export function buildActivityCalendar(
  rows: CalendarSource[],
  days = 365,
  today = new Date(),
): ProfileCalendarDay[] {
  const start = new Date(`${calendarStartDate(days, today)}T00:00:00Z`);

  const countByDay = new Map<string, number>();
  for (const row of rows) {
    countByDay.set(row.watchedOn, (countByDay.get(row.watchedOn) ?? 0) + 1);
  }

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { date: key, count: countByDay.get(key) ?? 0 };
  });
}

function recentWatches(history: ProfileActivitySource[], limit = 20): ProfileActivityItem[] {
  return [...history]
    .sort((a, b) => b.watchedAt - a.watchedAt)
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      mediaId: row.mediaId,
      mediaType: row.mediaType,
      title: row.title,
      slug: row.slug,
      watchedOn: row.watchedOn,
      seasonNumber: row.seasonNumber,
      episodeNumber: row.episodeNumber,
    }));
}

// The public projection: stats and activity, no ratings system and no genre data.
export function buildProfileActivity(
  library: FormatStatsSource[],
  history: ProfileActivitySource[],
  today = new Date(),
): { stats: ProfileStats; activity: ProfileActivity } {
  return {
    stats: buildProfileStats(library, history),
    activity: {
      calendar: buildActivityCalendar(history, 365, today),
      recent: recentWatches(history),
    },
  };
}
