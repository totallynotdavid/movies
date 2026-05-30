import { db } from "void/db";
import { libraryEntries, watchEvents } from "../../db/schema";
import { attempt, err, ok, type Result } from "../result";
import type { TrackingError } from "./errors";
import { findMedia, type MediaRecord } from "./media";
import { findEntry, type LibraryEntryRecord } from "./library";

type WatchEventInsert = typeof watchEvents.$inferInsert;

export type Instant = { watchedAt: number; watchedOn: string };

type WatchWrite = {
  event: WatchEventInsert;
  entry: LibraryEntryRecord;
};

type BuildInput = {
  userId: string;
  entry: LibraryEntryRecord | null;
  media: MediaRecord;
  at: Instant;
};

export function nowUtcInstant(): Instant {
  const watchedAt = Date.now();
  return { watchedAt, watchedOn: new Date(watchedAt).toISOString().slice(0, 10) };
}

function baseEntry(input: BuildInput): LibraryEntryRecord {
  const { userId, entry, media, at } = input;
  return {
    id: entry?.id ?? crypto.randomUUID(),
    userId,
    mediaId: media.id,
    status: entry?.status ?? "planned",
    score100: entry?.score100 ?? null,
    notes: entry?.notes ?? null,
    episodesWatched: entry?.episodesWatched ?? 0,
    lastWatchedAt: at.watchedAt,
    createdAt: entry?.createdAt ?? at.watchedAt,
    updatedAt: at.watchedAt,
  };
}

export function buildMovieWatch(input: BuildInput): Result<WatchWrite, TrackingError> {
  if (input.media.mediaType !== "movie") {
    return err({ kind: "wrong_media_type", expected: "movie", actual: input.media.mediaType });
  }

  const entry: LibraryEntryRecord = { ...baseEntry(input), status: "completed" };
  return ok({
    entry,
    event: {
      id: crypto.randomUUID(),
      userId: input.userId,
      mediaId: input.media.id,
      mediaType: "movie",
      watchedAt: input.at.watchedAt,
      watchedOn: input.at.watchedOn,
      episodeOrdinal: null,
      createdAt: input.at.watchedAt,
    },
  });
}

export function buildEpisodeWatch(input: BuildInput): Result<WatchWrite, TrackingError> {
  if (input.media.mediaType !== "show") {
    return err({ kind: "wrong_media_type", expected: "show", actual: input.media.mediaType });
  }

  const watched = input.entry?.episodesWatched ?? 0;
  const total = input.media.episodeCount;
  if (total !== null && watched >= total) {
    return err({ kind: "already_at_episode_total", total });
  }

  const nextOrdinal = watched + 1;
  const status = total !== null && nextOrdinal >= total ? "completed" : "watching";
  const entry: LibraryEntryRecord = { ...baseEntry(input), status, episodesWatched: nextOrdinal };

  return ok({
    entry,
    event: {
      id: crypto.randomUUID(),
      userId: input.userId,
      mediaId: input.media.id,
      mediaType: "show",
      watchedAt: input.at.watchedAt,
      watchedOn: input.at.watchedOn,
      episodeOrdinal: nextOrdinal,
      createdAt: input.at.watchedAt,
    },
  });
}

function commitWatch(write: WatchWrite): Promise<Result<LibraryEntryRecord, TrackingError>> {
  return attempt(
    db.batch([
      db
        .insert(libraryEntries)
        .values(write.entry)
        .onConflictDoUpdate({
          target: [libraryEntries.userId, libraryEntries.mediaId],
          set: {
            status: write.entry.status,
            episodesWatched: write.entry.episodesWatched,
            lastWatchedAt: write.entry.lastWatchedAt,
            updatedAt: write.entry.updatedAt,
          },
        }),
      db.insert(watchEvents).values(write.event),
    ]),
    (cause): TrackingError => ({ kind: "persistence_failed", cause }),
  ).then((result) => (result.ok ? ok(write.entry) : result));
}

export async function logMovieWatch(input: {
  userId: string;
  mediaId: string;
}): Promise<Result<LibraryEntryRecord, TrackingError>> {
  const media = await findMedia(input.mediaId);
  if (!media.ok) return media;
  const entry = await findEntry(input.userId, input.mediaId);
  if (!entry.ok) return entry;

  const write = buildMovieWatch({
    userId: input.userId,
    entry: entry.value,
    media: media.value,
    at: nowUtcInstant(),
  });
  if (!write.ok) return write;

  return commitWatch(write.value);
}

export async function logEpisodeWatch(input: {
  userId: string;
  mediaId: string;
}): Promise<Result<LibraryEntryRecord, TrackingError>> {
  const media = await findMedia(input.mediaId);
  if (!media.ok) return media;
  const entry = await findEntry(input.userId, input.mediaId);
  if (!entry.ok) return entry;

  const write = buildEpisodeWatch({
    userId: input.userId,
    entry: entry.value,
    media: media.value,
    at: nowUtcInstant(),
  });
  if (!write.ok) return write;

  return commitWatch(write.value);
}
