// Intent and fact are kept distinct on purpose. Filing a status (including
// "completed") is intent only and never fabricates a watch date, so cataloging
// an old movie does not pollute the timeline. Recording a watch is the only
// thing that writes a dated fact.

import { attempt, ok, type Result } from "@/result";
import { runBatch } from "@/db/kernel";
import type { TrackingError } from "@/domain/errors";
import { findMedia } from "@/domain/catalog/media";
import { getUserTimeZone } from "@/domain/user";
import { instantFor, type WatchInstant } from "@/domain/instant";
import { buildWatchEvent, watchEventInsertWrite } from "./watch-events";
import {
  buildEntry,
  entryUpsertWrite,
  findEntry,
  upsertEntry,
  type EntryPatch,
  type LibraryEntryRecord,
} from "./library-entries";
import {
  deriveShowProgress,
  loadShowEpisodes,
  pickEpisodeToLog,
  statusForShowProgress,
  type ShowProgress,
} from "./progress";
import type { EpisodeRef } from "@/shared/tracking";

// A watch always yields the entry; shows also return freshly derived progress so
// the client and server skip re-deriving it.
export type WatchOutcome = { entry: LibraryEntryRecord; progress?: ShowProgress };

async function resolveInstant(userId: string, watchedAt?: number): Promise<WatchInstant> {
  const timeZone = await getUserTimeZone(userId);
  return instantFor(watchedAt ?? Date.now(), timeZone);
}

// Intent write: status/score/notes in one upsert, no fact. Validates the media
// up front so an unknown id is a clean 404 rather than an FK failure. This is
// the only completion path for a movie that does not assert a watch, so
// cataloging an old title never fabricates a timeline entry.
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

async function commit(
  entry: LibraryEntryRecord,
  write: ReturnType<typeof entryUpsertWrite>[],
): Promise<Result<LibraryEntryRecord, TrackingError>> {
  const result = await attempt(
    runBatch(write),
    (cause): TrackingError => ({ kind: "persistence_failed", cause }),
  );
  if (!result.ok) return result;
  return ok(entry);
}

// A movie completes on a single watch. A show derives its status from the
// post-write episode set so repeated watches do not over-count progress.
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

  if (media.value.mediaType === "movie") {
    const instant = await resolveInstant(userId, watchedAt);
    const entry = buildEntry(userId, mediaId, prev.value, {
      status: "completed",
      lastWatchedAt: instant.watchedAt,
    });
    const event = buildWatchEvent(userId, media.value, instant, null);
    const committed = await commit(entry, [entryUpsertWrite(entry), watchEventInsertWrite(event)]);
    if (!committed.ok) return committed;
    return ok({ entry: committed.value });
  }

  // Load refs once. Derive pre-write progress to pick the next episode, then
  // post-write progress in memory for the response and the status decision.
  const { watched, aired, provisionalCount } = await loadShowEpisodes(userId, mediaId);
  const before = deriveShowProgress(watched, aired, provisionalCount);
  const fallbackEpisodeTotal = media.value.episodeCount;

  const picked = pickEpisodeToLog(before, fallbackEpisodeTotal, episode);
  if (!picked.ok) return picked;

  // Rewatches collapse in the watched set, so status must come from the derived
  // progress, not from watchedCount + 1.
  const after = picked.value
    ? deriveShowProgress([...watched, picked.value], aired, provisionalCount)
    : deriveShowProgress(watched, aired, provisionalCount + 1);
  const status = statusForShowProgress(after, fallbackEpisodeTotal);

  const instant = await resolveInstant(userId, watchedAt);
  const entry = buildEntry(userId, mediaId, prev.value, {
    status,
    lastWatchedAt: instant.watchedAt,
  });
  const event = buildWatchEvent(userId, media.value, instant, picked.value);

  const committed = await commit(entry, [entryUpsertWrite(entry), watchEventInsertWrite(event)]);
  if (!committed.ok) return committed;
  return ok({ entry: committed.value, progress: after });
}
