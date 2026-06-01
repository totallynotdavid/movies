// Watch-state seam for show progress derivation:
// Progress is derived from watch events and aired episodes. It is not stored as
// a counter. Callers should read progress through this module.

import { and, asc, eq, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "void/db";
import { episodes, watchEvents } from "@schema";
import { selectByIds } from "@/db/kernel";

export type EpisodeRef = { seasonNumber: number; episodeNumber: number };

export type ShowProgress = {
  // Distinct aired episodes the user has watched.
  watchedEpisodeCount: number;
  // Total aired episodes; null when the catalog has no episode rows yet (so we
  // can count what was watched but not what remains).
  airedEpisodeCount: number | null;
  // First aired episode not yet watched, in airing order.
  nextEpisode: EpisodeRef | null;
  // Every aired episode watched (and at least one exists). Whether this becomes
  // the "completed" library status also depends on the show having ended. That
  // decision lives in watch logging, not here.
  allAiredWatched: boolean;
};

function episodeKey(seasonNumber: number, episodeNumber: number): string {
  return `${seasonNumber}:${episodeNumber}`;
}

function uniqueEpisodes(items: EpisodeRef[]): EpisodeRef[] {
  return Array.from(
    new Map(
      items.map((episode) => [episodeKey(episode.seasonNumber, episode.episodeNumber), episode]),
    ).values(),
  );
}

export function resolveWatchedEpisodes(
  watched: EpisodeRef[],
  aired: EpisodeRef[],
  provisionalCount = 0,
): EpisodeRef[] {
  const explicit = uniqueEpisodes(watched);
  if (aired.length === 0) return explicit;

  const explicitKeys = new Set(
    explicit.map((episode) => episodeKey(episode.seasonNumber, episode.episodeNumber)),
  );

  const resolved: EpisodeRef[] = [];
  let remainingProvisional = provisionalCount;

  for (const episode of aired) {
    const key = episodeKey(episode.seasonNumber, episode.episodeNumber);
    if (explicitKeys.has(key)) {
      resolved.push(episode);
      continue;
    }
    if (remainingProvisional > 0) {
      resolved.push(episode);
      remainingProvisional -= 1;
    }
  }

  return resolved;
}

// Pure core. `aired` must be ordered by [season, episode].
export function deriveShowProgress(
  watched: EpisodeRef[],
  aired: EpisodeRef[],
  provisionalCount = 0,
): ShowProgress {
  const explicitCount = uniqueEpisodes(watched).length;

  if (aired.length === 0) {
    return {
      watchedEpisodeCount: explicitCount + provisionalCount,
      airedEpisodeCount: null,
      nextEpisode: null,
      allAiredWatched: false,
    };
  }

  const watchedKeys = new Set(
    resolveWatchedEpisodes(watched, aired, provisionalCount).map((episode) =>
      episodeKey(episode.seasonNumber, episode.episodeNumber),
    ),
  );

  let watchedEpisodeCount = 0;
  let nextEpisode: EpisodeRef | null = null;
  for (const episode of aired) {
    if (watchedKeys.has(episodeKey(episode.seasonNumber, episode.episodeNumber))) {
      watchedEpisodeCount += 1;
    } else if (nextEpisode === null) {
      nextEpisode = { seasonNumber: episode.seasonNumber, episodeNumber: episode.episodeNumber };
    }
  }

  return {
    watchedEpisodeCount,
    airedEpisodeCount: aired.length,
    nextEpisode,
    allAiredWatched: nextEpisode === null,
  };
}

// An episode counts as aired when its air date has passed, or is unknown. ISO
// dates compare lexically.
function airedEpisodeFilter(mediaIds: readonly string[]) {
  const today = new Date().toISOString().slice(0, 10);
  return and(
    inArray(episodes.mediaId, mediaIds as string[]),
    or(isNull(episodes.airDate), lte(episodes.airDate, today)),
  );
}

async function watchedEpisodesByMedia(
  userId: string,
  mediaIds: readonly string[],
): Promise<Map<string, EpisodeRef[]>> {
  const rows = await selectByIds(mediaIds, (batch) =>
    db
      .select({
        mediaId: watchEvents.mediaId,
        seasonNumber: watchEvents.seasonNumber,
        episodeNumber: watchEvents.episodeNumber,
      })
      .from(watchEvents)
      .where(
        and(
          eq(watchEvents.userId, userId),
          inArray(watchEvents.mediaId, batch),
          isNotNull(watchEvents.seasonNumber),
        ),
      ),
  );

  const byMedia = new Map<string, EpisodeRef[]>();
  for (const row of rows) {
    if (row.seasonNumber === null || row.episodeNumber === null) continue;
    const list = byMedia.get(row.mediaId) ?? [];
    list.push({ seasonNumber: row.seasonNumber, episodeNumber: row.episodeNumber });
    byMedia.set(row.mediaId, list);
  }
  return byMedia;
}

async function provisionalEpisodeCountsByMedia(
  userId: string,
  mediaIds: readonly string[],
): Promise<Map<string, number>> {
  const rows = await selectByIds(mediaIds, (batch) =>
    db
      .select({
        mediaId: watchEvents.mediaId,
        provisionalCount: sql<number>`count(*)`,
      })
      .from(watchEvents)
      .where(
        and(
          eq(watchEvents.userId, userId),
          eq(watchEvents.mediaType, "show"),
          inArray(watchEvents.mediaId, batch),
          isNull(watchEvents.seasonNumber),
        ),
      )
      .groupBy(watchEvents.mediaId),
  );

  return new Map(rows.map((row) => [row.mediaId, row.provisionalCount]));
}

async function airedEpisodesByMedia(
  mediaIds: readonly string[],
): Promise<Map<string, EpisodeRef[]>> {
  const rows = await selectByIds(mediaIds, (batch) =>
    db
      .select({
        mediaId: episodes.mediaId,
        seasonNumber: episodes.seasonNumber,
        episodeNumber: episodes.episodeNumber,
      })
      .from(episodes)
      .where(airedEpisodeFilter(batch))
      .orderBy(asc(episodes.mediaId), asc(episodes.seasonNumber), asc(episodes.episodeNumber)),
  );

  const byMedia = new Map<string, EpisodeRef[]>();
  for (const row of rows) {
    const list = byMedia.get(row.mediaId) ?? [];
    list.push({ seasonNumber: row.seasonNumber, episodeNumber: row.episodeNumber });
    byMedia.set(row.mediaId, list);
  }
  return byMedia;
}

export async function listShowProgress(
  userId: string,
  mediaIds: readonly string[],
): Promise<Map<string, ShowProgress>> {
  const ids = [...new Set(mediaIds)];
  if (ids.length === 0) return new Map();

  const [watched, provisional, aired] = await Promise.all([
    watchedEpisodesByMedia(userId, ids),
    provisionalEpisodeCountsByMedia(userId, ids),
    airedEpisodesByMedia(ids),
  ]);

  const progress = new Map<string, ShowProgress>();
  for (const mediaId of ids) {
    progress.set(
      mediaId,
      deriveShowProgress(
        watched.get(mediaId) ?? [],
        aired.get(mediaId) ?? [],
        provisional.get(mediaId) ?? 0,
      ),
    );
  }
  return progress;
}

// Returns raw watched and aired refs for one show. Write paths can derive
// pre-write and post-write progress from one fetch.
export async function loadShowEpisodes(
  userId: string,
  mediaId: string,
): Promise<{ watched: EpisodeRef[]; aired: EpisodeRef[]; provisionalCount: number }> {
  const [watched, provisional, aired] = await Promise.all([
    watchedEpisodesByMedia(userId, [mediaId]),
    provisionalEpisodeCountsByMedia(userId, [mediaId]),
    airedEpisodesByMedia([mediaId]),
  ]);
  return {
    watched: watched.get(mediaId) ?? [],
    aired: aired.get(mediaId) ?? [],
    provisionalCount: provisional.get(mediaId) ?? 0,
  };
}

export async function getShowProgress(userId: string, mediaId: string): Promise<ShowProgress> {
  const { watched, aired, provisionalCount } = await loadShowEpisodes(userId, mediaId);
  return deriveShowProgress(watched, aired, provisionalCount);
}

// The distinct (season, episode) the user has watched, for marking up an
// episode picker. Order is not significant.
export async function listWatchedEpisodes(userId: string, mediaId: string): Promise<EpisodeRef[]> {
  const { watched, aired, provisionalCount } = await loadShowEpisodes(userId, mediaId);
  return resolveWatchedEpisodes(watched, aired, provisionalCount);
}
