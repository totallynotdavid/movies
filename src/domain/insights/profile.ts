import type { MediaType } from "@/domain/catalog/media";
import { genresByMedia } from "@/domain/catalog/metadata";
import { entriesWithProgress } from "@/domain/tracking/library-entries";
import { listWatchHistory, type WatchHistoryRow } from "@/domain/tracking/watch-history";
import { buildMirror, type Mirror } from "./mirror";

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

export type ProfileFormatStats = Record<
  MediaType,
  {
    tracked: number;
    watchDays: number;
    averageScore100: number | null;
  }
>;

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

export type PublicProfileOverview = {
  formatStats: ProfileFormatStats;
  activityCalendar: ProfileCalendarDay[];
  recentActivity: ProfileActivityItem[];
};

export type ProfileOverview = PublicProfileOverview & { mirror: Mirror };

export function buildProfileFormatStats(
  libraryRows: FormatStatsSource[],
  watchRows: WatchDaySource[],
): ProfileFormatStats {
  const totals = {
    movie: { tracked: 0, watchDays: 0, averageScore100: null as number | null },
    show: { tracked: 0, watchDays: 0, averageScore100: null as number | null },
  };
  const ratingSums = { movie: 0, show: 0 };
  const ratingCounts = { movie: 0, show: 0 };
  const watchDays = {
    movie: new Set<string>(),
    show: new Set<string>(),
  };

  for (const row of libraryRows) {
    const bucket = totals[row.mediaType];
    bucket.tracked += 1;

    if (row.score100 !== null) {
      ratingSums[row.mediaType] += row.score100;
      ratingCounts[row.mediaType] += 1;
    }
  }

  for (const row of watchRows) {
    watchDays[row.mediaType].add(row.watchedOn);
  }

  for (const mediaType of ["movie", "show"] as const) {
    totals[mediaType].watchDays = watchDays[mediaType].size;
    totals[mediaType].averageScore100 =
      ratingCounts[mediaType] > 0 ? ratingSums[mediaType] / ratingCounts[mediaType] : null;
  }

  return totals;
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

function recentWatches(history: WatchHistoryRow[], limit = 20): ProfileActivityItem[] {
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

function buildPublicProfile(
  history: WatchHistoryRow[],
  entries: { media: { mediaType: MediaType }; score100: number | null }[],
): PublicProfileOverview {
  const formatSource: FormatStatsSource[] = entries.map((entry) => ({
    mediaType: entry.media.mediaType,
    score100: entry.score100,
  }));

  return {
    formatStats: buildProfileFormatStats(formatSource, history),
    activityCalendar: buildActivityCalendar(history),
    recentActivity: recentWatches(history),
  };
}

// Public profile reads skip genre data because only the private mirror uses it.
export async function getPublicProfileOverview(userId: string): Promise<PublicProfileOverview> {
  const [history, entries] = await Promise.all([
    listWatchHistory(userId),
    entriesWithProgress(userId),
  ]);
  return buildPublicProfile(history, entries);
}

export async function getProfileOverview(userId: string): Promise<ProfileOverview> {
  const history = await listWatchHistory(userId);
  const mediaIds = [...new Set(history.map((row) => row.mediaId))];

  const [entries, genres] = await Promise.all([
    entriesWithProgress(userId),
    genresByMedia(mediaIds),
  ]);

  return {
    ...buildPublicProfile(history, entries),
    mirror: buildMirror(history, genres, entries, Date.now()),
  };
}
