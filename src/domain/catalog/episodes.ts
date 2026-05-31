import { asc, eq, inArray } from "drizzle-orm";
import { db } from "void/db";
import { episodes, media } from "../../../db/schema";
import { insertChunks, selectByIds, type Statement } from "../../db/kernel";
import type { EpisodeInput } from "../../../shared/types/metadata";

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

export type EpisodeRecord = {
  seasonNumber: number;
  episodeNumber: number;
  name: string | null;
  runtime: number | null;
  airDate: string | null;
};

export type SeasonEpisodes = {
  seasonNumber: number;
  episodes: EpisodeRecord[];
};

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
