import { eq } from "drizzle-orm";
import { db } from "void/db";
import { episodes, media } from "../../db/schema";
import { insertChunks, type Statement } from "../db/kernel";
import type { EpisodeInput } from "../../shared/types/metadata";

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
