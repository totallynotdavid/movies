import { and, asc, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { db } from "void/db";
import { episodes, media } from "@schema";
import { insertChunks, selectByIds, type Statement } from "@/db/kernel";
import type { EpisodeInput } from "@/shared/types/metadata";
import type { EpisodeRef } from "@/shared/tracking";
import type { SeasonEpisodes } from "@/shared/catalog";

export type { SeasonEpisodes };

export type EpisodeRuntime = {
  mediaId: string;
  seasonNumber: number;
  episodeNumber: number;
  runtime: number | null;
};

// Bulk episode runtimes across a set of shows, ordered by airing identity, for
// the wrapped recap's per-episode runtime resolution.
export async function episodeRuntimesByMedia(
  mediaIds: readonly string[],
): Promise<EpisodeRuntime[]> {
  return selectByIds(mediaIds, (batch) =>
    db
      .select({
        mediaId: episodes.mediaId,
        seasonNumber: episodes.seasonNumber,
        episodeNumber: episodes.episodeNumber,
        runtime: episodes.runtime,
      })
      .from(episodes)
      .where(inArray(episodes.mediaId, batch))
      .orderBy(asc(episodes.mediaId), asc(episodes.seasonNumber), asc(episodes.episodeNumber)),
  );
}

export async function listEpisodesBySeason(mediaId: string): Promise<SeasonEpisodes[]> {
  const rows = await db
    .select({
      seasonNumber: episodes.seasonNumber,
      episodeNumber: episodes.episodeNumber,
      name: episodes.name,
      runtime: episodes.runtime,
      airDate: episodes.airDate,
    })
    .from(episodes)
    .where(eq(episodes.mediaId, mediaId))
    .orderBy(asc(episodes.seasonNumber), asc(episodes.episodeNumber));

  const seasons: SeasonEpisodes[] = [];
  let current: SeasonEpisodes | null = null;
  for (const row of rows) {
    if (!current || current.seasonNumber !== row.seasonNumber) {
      current = { seasonNumber: row.seasonNumber, episodes: [] };
      seasons.push(current);
    }
    current.episodes.push(row);
  }
  return seasons;
}

// An episode counts as aired when its air date has passed, or is unknown. ISO
// dates compare lexically. Grouped by media as ordered EpisodeRefs, the input
// the progress derive core expects.
export async function airedEpisodeRefs(
  mediaIds: readonly string[],
): Promise<Map<string, EpisodeRef[]>> {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await selectByIds(mediaIds, (batch) =>
    db
      .select({
        mediaId: episodes.mediaId,
        seasonNumber: episodes.seasonNumber,
        episodeNumber: episodes.episodeNumber,
      })
      .from(episodes)
      .where(
        and(
          inArray(episodes.mediaId, batch),
          or(isNull(episodes.airDate), lte(episodes.airDate, today)),
        ),
      )
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

export function mediaEpisodesWrite(mediaId: string, items: EpisodeInput[]): Statement[] {
  const now = Date.now();
  const rows = items.map((e) => ({
    id: `${mediaId}:s${e.seasonNumber}e${e.episodeNumber}`,
    mediaId,
    seasonNumber: e.seasonNumber,
    episodeNumber: e.episodeNumber,
    name: e.name,
    runtime: e.runtime,
    airDate: e.airDate,
    createdAt: now,
    updatedAt: now,
  }));

  return [
    db.delete(episodes).where(eq(episodes.mediaId, mediaId)),
    ...insertChunks(rows, (part) => db.insert(episodes).values(part)),
  ];
}

export function markEpisodesFreshWrite(mediaId: string): Statement[] {
  const now = Date.now();
  return [
    db
      .update(media)
      .set({ episodesHydratedAt: now, episodesError: null, updatedAt: now })
      .where(eq(media.id, mediaId)),
  ];
}

export function markEpisodesFailedWrite(mediaId: string, error: string): Statement[] {
  const now = Date.now();
  return [
    db.update(media).set({ episodesError: error, updatedAt: now }).where(eq(media.id, mediaId)),
  ];
}
