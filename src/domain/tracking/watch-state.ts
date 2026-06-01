// Watch-state seam for show progress derivation:
// Progress is derived from watch events and aired episodes. It is not stored as
// a counter. Callers should read progress through this module.

import { and, asc, eq, inArray, isNotNull, isNull, lte, or } from "drizzle-orm";
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

// Pure core. `aired` must be ordered by [season, episode].
export function deriveShowProgress(watched: EpisodeRef[], aired: EpisodeRef[]): ShowProgress {
  const watchedKeys = new Set(watched.map((e) => episodeKey(e.seasonNumber, e.episodeNumber)));

  if (aired.length === 0) {
    return {
      watchedEpisodeCount: watchedKeys.size,
      airedEpisodeCount: null,
      nextEpisode: null,
      allAiredWatched: false,
    };
  }

  let watchedAired = 0;
  let nextEpisode: EpisodeRef | null = null;
  for (const ep of aired) {
    if (watchedKeys.has(episodeKey(ep.seasonNumber, ep.episodeNumber))) {
      watchedAired += 1;
    } else if (nextEpisode === null) {
      nextEpisode = { seasonNumber: ep.seasonNumber, episodeNumber: ep.episodeNumber };
    }
  }

  return {
    watchedEpisodeCount: watchedAired,
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

  const [watched, aired] = await Promise.all([
    watchedEpisodesByMedia(userId, ids),
    airedEpisodesByMedia(ids),
  ]);

  const progress = new Map<string, ShowProgress>();
  for (const mediaId of ids) {
    progress.set(mediaId, deriveShowProgress(watched.get(mediaId) ?? [], aired.get(mediaId) ?? []));
  }
  return progress;
}

// Returns raw watched and aired refs for one show. Write paths can derive
// pre-write and post-write progress from one fetch.
export async function loadShowEpisodes(
  userId: string,
  mediaId: string,
): Promise<{ watched: EpisodeRef[]; aired: EpisodeRef[] }> {
  const [watched, aired] = await Promise.all([
    watchedEpisodesByMedia(userId, [mediaId]),
    airedEpisodesByMedia([mediaId]),
  ]);
  return { watched: watched.get(mediaId) ?? [], aired: aired.get(mediaId) ?? [] };
}

export async function getShowProgress(userId: string, mediaId: string): Promise<ShowProgress> {
  const { watched, aired } = await loadShowEpisodes(userId, mediaId);
  return deriveShowProgress(watched, aired);
}

// The distinct (season, episode) the user has watched, for marking up an
// episode picker. Order is not significant.
export async function listWatchedEpisodes(userId: string, mediaId: string): Promise<EpisodeRef[]> {
  const map = await watchedEpisodesByMedia(userId, [mediaId]);
  return map.get(mediaId) ?? [];
}
