import { db } from "void/db";
import { libraryEntries, watchEvents } from "@schema";
import { attempt, err, ok, type Result } from "@/result";
import type { TrackingError } from "@/domain/errors";
import { instantFor, type WatchInstant } from "@/domain/instant";
import { findMedia, type MediaRecord } from "@/domain/catalog/media";
import { findEntry, type LibraryEntryRecord } from "./library";
import { getUserTimeZone } from "@/domain/user";
import {
  deriveShowProgress,
  loadShowEpisodes,
  type EpisodeRef,
  type ShowProgress,
} from "./watch-state";

type WatchEventInsert = typeof watchEvents.$inferInsert;

type WatchWrite = {
  event: WatchEventInsert;
  entry: LibraryEntryRecord;
};

type EntryOverrides = {
  score100?: number | null;
  notes?: string | null;
};

// Episode logs return derived progress so routes do not re-query projections.
export type EpisodeWatch = {
  entry: LibraryEntryRecord;
  progress: ShowProgress;
};

// Library status is mutable intent. Movies complete on one watch. For shows,
// completion is decided from post-write derived progress.
function entryFor(
  prev: LibraryEntryRecord | null,
  userId: string,
  media: MediaRecord,
  status: LibraryEntryRecord["status"],
  instant: WatchInstant,
  overrides: EntryOverrides = {},
): LibraryEntryRecord {
  const now = Date.now();
  return {
    id: prev?.id ?? crypto.randomUUID(),
    userId,
    mediaId: media.id,
    status,
    score100: overrides.score100 !== undefined ? overrides.score100 : (prev?.score100 ?? null),
    notes: overrides.notes !== undefined ? overrides.notes : (prev?.notes ?? null),
    // Keeps the most recent watch instant, including back-dated logs.
    lastWatchedAt: Math.max(prev?.lastWatchedAt ?? 0, instant.watchedAt),
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  };
}

function eventFor(
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
            score100: write.entry.score100,
            notes: write.entry.notes,
            lastWatchedAt: write.entry.lastWatchedAt,
            updatedAt: write.entry.updatedAt,
          },
        }),
      db.insert(watchEvents).values(write.event),
    ]),
    (cause): TrackingError => ({ kind: "persistence_failed", cause }),
  ).then((result) => (result.ok ? ok(write.entry) : result));
}

async function resolveInstant(userId: string, watchedAt?: number): Promise<WatchInstant> {
  const timeZone = await getUserTimeZone(userId);
  return instantFor(watchedAt ?? Date.now(), timeZone);
}

export async function logMovieWatch(input: {
  userId: string;
  mediaId: string;
  watchedAt?: number;
  score100?: number | null;
  notes?: string | null;
}): Promise<Result<LibraryEntryRecord, TrackingError>> {
  const media = await findMedia(input.mediaId);
  if (!media.ok) return media;
  if (media.value.mediaType !== "movie") {
    return err({ kind: "wrong_media_type", expected: "movie", actual: media.value.mediaType });
  }

  const entry = await findEntry(input.userId, input.mediaId);
  if (!entry.ok) return entry;

  const instant = await resolveInstant(input.userId, input.watchedAt);
  return commitWatch({
    entry: entryFor(entry.value, input.userId, media.value, "completed", instant, {
      score100: input.score100,
      notes: input.notes,
    }),
    event: eventFor(input.userId, media.value, instant, null),
  });
}

function statusForShowProgress(
  progress: ShowProgress,
  fallbackEpisodeTotal: number | null,
): LibraryEntryRecord["status"] {
  if (progress.allAiredWatched) return "completed";
  if (progress.airedEpisodeCount === null && fallbackEpisodeTotal !== null) {
    return progress.watchedEpisodeCount >= fallbackEpisodeTotal ? "completed" : "watching";
  }
  return "watching";
}

export async function logEpisodeWatch(input: {
  userId: string;
  mediaId: string;
  episode?: EpisodeRef;
  watchedAt?: number;
}): Promise<Result<EpisodeWatch, TrackingError>> {
  const media = await findMedia(input.mediaId);
  if (!media.ok) return media;
  if (media.value.mediaType !== "show") {
    return err({ kind: "wrong_media_type", expected: "show", actual: media.value.mediaType });
  }

  const entry = await findEntry(input.userId, input.mediaId);
  if (!entry.ok) return entry;

  // Load refs once. Derive pre-write progress to pick the next episode and
  // completion. Derive post-write progress in memory for the response.
  const { watched, aired, provisionalCount } = await loadShowEpisodes(input.userId, input.mediaId);
  const progress = deriveShowProgress(watched, aired, provisionalCount);
  const fallbackEpisodeTotal = media.value.episodeCount;

  let episode: EpisodeRef | null;
  if (input.episode) {
    episode = input.episode;
  } else if (progress.nextEpisode) {
    episode = progress.nextEpisode;
  } else if (progress.airedEpisodeCount !== null) {
    // Every aired episode is already watched.
    return err({ kind: "already_at_episode_total", total: progress.airedEpisodeCount });
  } else if (fallbackEpisodeTotal !== null) {
    if (progress.watchedEpisodeCount >= fallbackEpisodeTotal) {
      return err({ kind: "already_at_episode_total", total: fallbackEpisodeTotal });
    }
    episode = null;
  } else {
    // No catalog episodes yet. Caller must pass an explicit episode or wait for
    // hydration.
    return err({ kind: "episodes_not_ready", mediaId: input.mediaId });
  }

  // Re-derive progress after selecting the episode, using the same loaded refs.
  // Rewatches collapse in the watched set, so status must come from
  // `allAiredWatched`, not from `watchedCount + 1`.
  const after = episode
    ? deriveShowProgress([...watched, episode], aired, provisionalCount)
    : deriveShowProgress(watched, aired, provisionalCount + 1);
  const status = statusForShowProgress(after, fallbackEpisodeTotal);

  const instant = await resolveInstant(input.userId, input.watchedAt);
  const committed = await commitWatch({
    entry: entryFor(entry.value, input.userId, media.value, status, instant),
    event: eventFor(input.userId, media.value, instant, episode),
  });
  if (!committed.ok) return committed;

  return ok({ entry: committed.value, progress: after });
}
