import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "void/db";
import { libraryEntries, media, watchEvents } from "../../db/schema";
import type { MediaType } from "./media";

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

export type ProfileActivityItem = {
  id: string;
  mediaId: string;
  mediaType: MediaType;
  title: string;
  slug: string;
  watchedAt: number;
  watchedOn: string;
  episodeOrdinal: number | null;
};

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

export async function getProfileFormatStats(userId: string) {
  const [libraryRows, watchRows] = await Promise.all([
    db
      .select({
        mediaType: media.mediaType,
        score100: libraryEntries.score100,
      })
      .from(libraryEntries)
      .innerJoin(media, eq(libraryEntries.mediaId, media.id))
      .where(eq(libraryEntries.userId, userId)),
    db
      .select({
        mediaType: watchEvents.mediaType,
        watchedOn: watchEvents.watchedOn,
      })
      .from(watchEvents)
      .where(eq(watchEvents.userId, userId)),
  ]);

  return buildProfileFormatStats(libraryRows, watchRows);
}

export async function getProfileActivityCalendar(userId: string, days = 365) {
  const today = new Date();
  const rows = await db
    .select({ watchedOn: watchEvents.watchedOn })
    .from(watchEvents)
    .where(
      and(
        eq(watchEvents.userId, userId),
        gte(watchEvents.watchedOn, calendarStartDate(days, today)),
      ),
    );

  return buildActivityCalendar(rows, days, today);
}

export async function listProfileActivity(
  userId: string,
  limit = 20,
): Promise<ProfileActivityItem[]> {
  return db
    .select({
      id: watchEvents.id,
      mediaId: watchEvents.mediaId,
      mediaType: watchEvents.mediaType,
      title: media.title,
      slug: media.slug,
      watchedAt: watchEvents.watchedAt,
      watchedOn: watchEvents.watchedOn,
      episodeOrdinal: watchEvents.episodeOrdinal,
    })
    .from(watchEvents)
    .innerJoin(media, eq(watchEvents.mediaId, media.id))
    .where(eq(watchEvents.userId, userId))
    .orderBy(desc(watchEvents.watchedAt))
    .limit(limit);
}
