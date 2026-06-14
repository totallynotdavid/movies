import { and, eq, sql } from "drizzle-orm";
import { db } from "void/db";
import { favoriteMedia, libraryEntries, watchEvents } from "@schema";
import { airedEpisodeRefs } from "@/domain/catalog/episodes";
import { resolveStatus, type LibraryStatus } from "@/shared/library-status";
import type { MediaType } from "@/domain/catalog/media";

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

export async function getMediaStats(mediaId: string, mediaType: MediaType): Promise<MediaStats> {
  // Status distribution has no shared progress row, so this aggregates per
  // tracker before resolving status. For a very popular title this is the
  // heaviest read on the page; a materialized stat is the escape hatch.
  const episodeKey = sql<string>`${watchEvents.seasonNumber} || ':' || ${watchEvents.episodeNumber}`;

  const [trackers, aired, favRows] = await Promise.all([
    db
      .select({
        filed: libraryEntries.filedStatus,
        score: libraryEntries.score100,
        watchedDistinct: sql<number>`count(distinct case when ${watchEvents.seasonNumber} is not null then ${episodeKey} end)`,
        provisional: sql<number>`coalesce(sum(case when ${watchEvents.id} is not null and ${watchEvents.seasonNumber} is null then 1 else 0 end), 0)`,
        watches: sql<number>`count(${watchEvents.id})`,
      })
      .from(libraryEntries)
      .leftJoin(
        watchEvents,
        and(
          eq(watchEvents.userId, libraryEntries.userId),
          eq(watchEvents.mediaId, libraryEntries.mediaId),
        ),
      )
      .where(eq(libraryEntries.mediaId, mediaId))
      .groupBy(libraryEntries.id),
    mediaType === "show" ? airedEpisodeRefs([mediaId]) : Promise.resolve(null),
    db
      .select({ n: sql<number>`count(*)` })
      .from(favoriteMedia)
      .where(eq(favoriteMedia.mediaId, mediaId)),
  ]);

  const airedCount = aired?.get(mediaId)?.length ?? 0;

  const statusCounts = { ...EMPTY_STATUS };
  let scoreSum = 0;
  let scoreCount = 0;

  for (const t of trackers) {
    const watchedCount =
      mediaType === "movie" ? (t.watches > 0 ? 1 : 0) : t.watchedDistinct + t.provisional;
    const complete =
      mediaType === "movie" ? t.watches > 0 : airedCount > 0 && watchedCount >= airedCount;

    statusCounts[resolveStatus(t.filed, { complete, watchedCount })] += 1;
    if (t.score !== null) {
      scoreSum += t.score;
      scoreCount += 1;
    }
  }

  return {
    trackedCount: trackers.length,
    statusCounts,
    trackScore: scoreCount > 0 ? scoreSum / scoreCount : null,
    scoreCount,
    favoriteCount: favRows[0]?.n ?? 0,
  };
}
