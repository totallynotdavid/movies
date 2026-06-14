// Fact seam: watch_events is append-only. This module is the sole writer of the
// table and owns the raw reads the progress derive core consumes. It never
// touches library_entries (intent) or derives anything.

import { and, eq, inArray } from "drizzle-orm";
import { db } from "void/db";
import { watchEvents } from "@schema";
import { selectByIds, type Statement } from "@/db/kernel";
import type { MediaRecord } from "@/domain/catalog/media";
import type { WatchInstant } from "@/domain/instant";
import type { EpisodeRef } from "@/shared/tracking";

export type WatchEventInsert = typeof watchEvents.$inferInsert;

// A null episode is a provisional show watch: a real "I watched an episode"
// fact logged before the catalog knew which episode. The progress core resolves
// it onto the earliest unwatched aired row at read time.
export function buildWatchEvent(
  userId: string,
  media: MediaRecord,
  instant: WatchInstant,
  episode: EpisodeRef | null,
): WatchEventInsert {
  return {
    id: crypto.randomUUID(),
    userId,
    mediaId: media.id,
    mediaType: media.mediaType,
    seasonNumber: episode?.seasonNumber ?? null,
    episodeNumber: episode?.episodeNumber ?? null,
    watchedAt: instant.watchedAt,
    watchedOn: instant.watchedOn,
    utcOffsetMinutes: instant.utcOffsetMinutes,
    createdAt: Date.now(),
  };
}

export function watchEventInsertWrite(event: WatchEventInsert): Statement {
  return db.insert(watchEvents).values(event);
}

export type WatchedEpisodes = { watched: EpisodeRef[]; provisionalCount: number };

// Episode-tagged rows build the explicit watched set.
// Null-episode rows count as provisional watches until progress maps them to aired rows.
export async function watchedAndProvisional(
  userId: string,
  mediaIds: readonly string[],
): Promise<Map<string, WatchedEpisodes>> {
  const rows = await selectByIds(mediaIds, (batch) =>
    db
      .select({
        mediaId: watchEvents.mediaId,
        seasonNumber: watchEvents.seasonNumber,
        episodeNumber: watchEvents.episodeNumber,
      })
      .from(watchEvents)
      .where(and(eq(watchEvents.userId, userId), inArray(watchEvents.mediaId, batch))),
  );

  const byMedia = new Map<string, WatchedEpisodes>();
  const bucket = (mediaId: string): WatchedEpisodes => {
    const existing = byMedia.get(mediaId);
    if (existing) return existing;
    const created: WatchedEpisodes = { watched: [], provisionalCount: 0 };
    byMedia.set(mediaId, created);
    return created;
  };

  for (const row of rows) {
    const entry = bucket(row.mediaId);
    if (row.seasonNumber === null || row.episodeNumber === null) {
      entry.provisionalCount += 1;
      continue;
    }
    entry.watched.push({ seasonNumber: row.seasonNumber, episodeNumber: row.episodeNumber });
  }
  return byMedia;
}
