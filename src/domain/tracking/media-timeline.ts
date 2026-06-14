import { desc, eq, sql } from "drizzle-orm";
import { db } from "void/db";
import { libraryEntries, watchEvents } from "@schema";

export type MediaTimelineDay = {
  date: string;
  watches: number;
};

export type MediaTimelineView = {
  days: MediaTimelineDay[];
  watches: number;
  users: number;
  lastDay: string | null;
  trackedCount: number;
};

const MAX_DAYS = 120;

export async function getTimelineView(mediaId: string, days = 90): Promise<MediaTimelineView> {
  const limit = Math.min(Math.max(days, 1), MAX_DAYS);

  const [daily, totals, tracked] = await Promise.all([
    db
      .select({
        date: watchEvents.watchedOn,
        watches: sql<number>`count(*)`,
      })
      .from(watchEvents)
      .where(eq(watchEvents.mediaId, mediaId))
      .groupBy(watchEvents.watchedOn)
      .orderBy(desc(watchEvents.watchedOn))
      .limit(limit),
    db
      .select({
        watches: sql<number>`count(*)`,
        users: sql<number>`count(distinct ${watchEvents.userId})`,
        lastDay: sql<string | null>`max(${watchEvents.watchedOn})`,
      })
      .from(watchEvents)
      .where(eq(watchEvents.mediaId, mediaId)),
    db
      .select({ n: sql<number>`count(*)` })
      .from(libraryEntries)
      .where(eq(libraryEntries.mediaId, mediaId)),
  ]);

  const summary = totals[0] ?? { watches: 0, users: 0, lastDay: null };
  return {
    days: daily,
    watches: summary.watches,
    users: summary.users,
    lastDay: summary.lastDay,
    trackedCount: tracked[0]?.n ?? 0,
  };
}
