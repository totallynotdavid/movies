import { and, eq, gte } from "drizzle-orm";
import { db } from "void/db";
import { libraryEntries, media, watchEvents } from "../../../db/schema";
import type { MediaType } from "../catalog/media";

// Reads behavior history joined with media and score fields.
// Keep this as the single join/filter owner for history reads.
export type WatchHistoryRow = {
  id: string;
  mediaId: string;
  mediaType: MediaType;
  title: string;
  slug: string;
  posterPath: string | null;
  releaseDate: string | null;
  runtime: number | null;
  score100: number | null;
  watchedAt: number;
  watchedOn: string;
  utcOffsetMinutes: number;
  seasonNumber: number | null;
  episodeNumber: number | null;
};

// `since` filters on local watch day [YYYY-MM-DD, inclusive]. Omit for all-time.
export async function listWatchHistory(
  userId: string,
  window?: { since?: string },
): Promise<WatchHistoryRow[]> {
  const filters = [eq(watchEvents.userId, userId)];
  if (window?.since) filters.push(gte(watchEvents.watchedOn, window.since));

  return db
    .select({
      id: watchEvents.id,
      mediaId: watchEvents.mediaId,
      mediaType: watchEvents.mediaType,
      title: media.title,
      slug: media.slug,
      posterPath: media.posterPath,
      releaseDate: media.releaseDate,
      runtime: media.runtime,
      score100: libraryEntries.score100,
      watchedAt: watchEvents.watchedAt,
      watchedOn: watchEvents.watchedOn,
      utcOffsetMinutes: watchEvents.utcOffsetMinutes,
      seasonNumber: watchEvents.seasonNumber,
      episodeNumber: watchEvents.episodeNumber,
    })
    .from(watchEvents)
    .innerJoin(media, eq(watchEvents.mediaId, media.id))
    .leftJoin(
      libraryEntries,
      and(eq(libraryEntries.userId, userId), eq(libraryEntries.mediaId, watchEvents.mediaId)),
    )
    .where(and(...filters));
}
