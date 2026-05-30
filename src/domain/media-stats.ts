import { eq, sql } from "drizzle-orm";
import { db } from "void/db";
import { favoriteMedia, libraryEntries } from "../../db/schema";
import type { LibraryStatus } from "./library";

// Platform-native stats only render once enough users engage, so a tiny user
// base never shows an embarrassing "score 80 from 1 person".
export const STATS_MIN_TRACKED = 3;
export const STATS_MIN_SCORES = 5;

export type MediaStats = {
  trackedCount: number;
  statusCounts: Record<LibraryStatus, number>;
  trackScore: number | null;
  scoreCount: number;
  favoriteCount: number;
};

const EMPTY_STATUS: Record<LibraryStatus, number> = {
  planned: 0,
  watching: 0,
  completed: 0,
  paused: 0,
  dropped: 0,
};

export async function getMediaStats(mediaId: string): Promise<MediaStats> {
  // Aggregate in SQL (count/sum per status) so we never pull per-user rows
  // into app memory just to derive a handful of totals.
  const [statusRows, favRows] = await Promise.all([
    db
      .select({
        status: libraryEntries.status,
        tracked: sql<number>`count(*)`,
        scored: sql<number>`count(${libraryEntries.score100})`,
        scoreSum: sql<number>`coalesce(sum(${libraryEntries.score100}), 0)`,
      })
      .from(libraryEntries)
      .where(eq(libraryEntries.mediaId, mediaId))
      .groupBy(libraryEntries.status),
    db
      .select({ n: sql<number>`count(*)` })
      .from(favoriteMedia)
      .where(eq(favoriteMedia.mediaId, mediaId)),
  ]);

  const statusCounts = { ...EMPTY_STATUS };
  let trackedCount = 0;
  let scoreSum = 0;
  let scoreCount = 0;
  for (const row of statusRows) {
    statusCounts[row.status] = row.tracked;
    trackedCount += row.tracked;
    scoreSum += row.scoreSum;
    scoreCount += row.scored;
  }

  return {
    trackedCount,
    statusCounts,
    trackScore: scoreCount > 0 ? scoreSum / scoreCount : null,
    scoreCount,
    favoriteCount: favRows[0]?.n ?? 0,
  };
}
