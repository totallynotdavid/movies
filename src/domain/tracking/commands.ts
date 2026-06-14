import { db } from "void/db";
import { and, eq } from "drizzle-orm";
import { libraryEntries, watchEvents } from "@schema";
import { attempt, ok, type Result } from "@/result";
import { runBatch, type Statement } from "@/db/kernel";
import type { TrackingError } from "@/domain/errors";
import { findMedia } from "@/domain/catalog/media";
import { getUserTimeZone } from "@/domain/user";
import { instantFor, type WatchInstant } from "@/domain/instant";
import { buildWatchEvent, watchEventInsertWrite } from "./watch-events";
import {
  buildEntry,
  ensureEntryWrite,
  findEntry,
  upsertEntry,
  type EntryPatch,
  type LibraryEntryRecord,
} from "./library-entries";
import { deriveShowProgress, loadShowEpisodes, pickEpisodeToLog } from "./progress";
import type { EpisodeRef } from "@/shared/tracking";

export type WatchOutcome = { entry: LibraryEntryRecord; watchedEpisodeCount: number };

async function resolveInstant(userId: string, watchedAt?: number): Promise<WatchInstant> {
  const timeZone = await getUserTimeZone(userId);
  return instantFor(watchedAt ?? Date.now(), timeZone);
}

// Validate media first so an unknown id is a clean 404 rather than an FK failure.
export async function saveEntry(
  userId: string,
  mediaId: string,
  patch: EntryPatch,
): Promise<Result<LibraryEntryRecord, TrackingError>> {
  const media = await findMedia(mediaId);
  if (!media.ok) return media;

  const prev = await findEntry(userId, mediaId);
  if (!prev.ok) return prev;
  return upsertEntry(buildEntry(userId, mediaId, prev.value, patch));
}

// Untracking removes the library row and watch events together.
export async function removeEntry(
  userId: string,
  mediaId: string,
): Promise<Result<void, TrackingError>> {
  const result = await attempt(
    runBatch([
      db
        .delete(libraryEntries)
        .where(and(eq(libraryEntries.userId, userId), eq(libraryEntries.mediaId, mediaId))),
      db
        .delete(watchEvents)
        .where(and(eq(watchEvents.userId, userId), eq(watchEvents.mediaId, mediaId))),
    ]),
    (cause): TrackingError => ({ kind: "persistence_failed", cause }),
  );
  if (!result.ok) return result;
  return ok(undefined);
}

// Ensure the library row exists without disturbing filed intent.
export async function recordWatch(
  userId: string,
  mediaId: string,
  episode?: EpisodeRef,
  watchedAt?: number,
): Promise<Result<WatchOutcome, TrackingError>> {
  const media = await findMedia(mediaId);
  if (!media.ok) return media;

  const prev = await findEntry(userId, mediaId);
  if (!prev.ok) return prev;
  const entry = prev.value ?? buildEntry(userId, mediaId, null, {});
  const instant = await resolveInstant(userId, watchedAt);

  if (media.value.mediaType === "movie") {
    const event = buildWatchEvent(userId, media.value, instant, null);
    const written = await write([ensureEntryWrite(entry), watchEventInsertWrite(event)]);
    if (!written.ok) return written;
    return ok({ entry, watchedEpisodeCount: 1 });
  }

  // Load refs once: derive pre-write progress to pick the next episode, then
  // post-write progress in memory for the response. Rewatches collapse in the
  // watched set, so the count comes from the derived progress, not watched + 1.
  const { watched, aired, provisionalCount } = await loadShowEpisodes(userId, mediaId);
  const before = deriveShowProgress(watched, aired, provisionalCount);

  const picked = pickEpisodeToLog(before, media.value.episodeCount, episode);
  if (!picked.ok) return picked;

  const after = picked.value
    ? deriveShowProgress([...watched, picked.value], aired, provisionalCount)
    : deriveShowProgress(watched, aired, provisionalCount + 1);

  const event = buildWatchEvent(userId, media.value, instant, picked.value);
  const written = await write([ensureEntryWrite(entry), watchEventInsertWrite(event)]);
  if (!written.ok) return written;
  return ok({ entry, watchedEpisodeCount: after.watchedEpisodeCount });
}

// Reverses a single episode watch, the undo for an over-eager log.
export async function unwatchEpisode(
  userId: string,
  mediaId: string,
  episode: EpisodeRef,
): Promise<Result<WatchOutcome, TrackingError>> {
  const prev = await findEntry(userId, mediaId);
  if (!prev.ok) return prev;
  const entry = prev.value ?? buildEntry(userId, mediaId, null, {});

  const removed = await write([
    db
      .delete(watchEvents)
      .where(
        and(
          eq(watchEvents.userId, userId),
          eq(watchEvents.mediaId, mediaId),
          eq(watchEvents.seasonNumber, episode.seasonNumber),
          eq(watchEvents.episodeNumber, episode.episodeNumber),
        ),
      ),
  ]);
  if (!removed.ok) return removed;

  const { watched, aired, provisionalCount } = await loadShowEpisodes(userId, mediaId);
  const after = deriveShowProgress(watched, aired, provisionalCount);
  return ok({ entry, watchedEpisodeCount: after.watchedEpisodeCount });
}

async function write(statements: Statement[]): Promise<Result<void, TrackingError>> {
  const result = await attempt(
    runBatch(statements),
    (cause): TrackingError => ({ kind: "persistence_failed", cause }),
  );
  if (!result.ok) return result;
  return ok(undefined);
}
