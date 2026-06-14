import type { TrackingError } from "@/domain/errors";
import { airedEpisodeRefs } from "@/domain/catalog/episodes";
import { watchedAndProvisional } from "./watch-events";
import { err, ok, type Result } from "@/result";
import { episodeKey, type EpisodeRef } from "@/shared/tracking";
import type { LibraryStatus } from "@/shared/library-status";

export type ShowProgress = {
  // Distinct aired episodes the user has watched.
  watchedEpisodeCount: number;
  // Total aired episodes; null when the catalog has no episode rows yet.
  airedEpisodeCount: number | null;
  // First aired episode not yet watched, in airing order.
  nextEpisode: EpisodeRef | null;
  // Every aired episode watched (and at least one exists). Whether this becomes
  // the "completed" library status also depends on the show having ended; that
  // decision lives in statusForShowProgress, not here.
  allAiredWatched: boolean;
};

function uniqueEpisodes(items: EpisodeRef[]): EpisodeRef[] {
  return Array.from(
    new Map(
      items.map((episode) => [episodeKey(episode.seasonNumber, episode.episodeNumber), episode]),
    ).values(),
  );
}

// Maps provisional (null-episode) watches onto the earliest unwatched aired
// episodes, in airing order, so the count reflects what was watched even before
// the catalog named the episodes.
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

// `aired` must be ordered by [season, episode].
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

// Library status is mutable intent. For shows, completion follows from derived
// progress: all aired watched, or (pre-hydration) the watched count reaching a
// known episode total.
export function statusForShowProgress(
  progress: ShowProgress,
  fallbackEpisodeTotal: number | null,
): LibraryStatus {
  if (progress.allAiredWatched) return "completed";
  if (progress.airedEpisodeCount === null && fallbackEpisodeTotal !== null) {
    return progress.watchedEpisodeCount >= fallbackEpisodeTotal ? "completed" : "watching";
  }
  return "watching";
}

export function pickEpisodeToLog(
  progress: ShowProgress,
  fallbackEpisodeTotal: number | null,
  requestedEpisode?: EpisodeRef,
): Result<EpisodeRef | null, TrackingError> {
  if (requestedEpisode) return ok(requestedEpisode);
  if (progress.nextEpisode) return ok(progress.nextEpisode);
  if (progress.airedEpisodeCount !== null) {
    return err({ kind: "already_at_episode_total", total: progress.airedEpisodeCount });
  }
  if (fallbackEpisodeTotal !== null && progress.watchedEpisodeCount >= fallbackEpisodeTotal) {
    return err({ kind: "already_at_episode_total", total: fallbackEpisodeTotal });
  }

  // Episode rows are still missing, so quick-logging stays provisional. The
  // read helpers later resolve these null-episode events onto aired rows.
  return ok(null);
}

export type ShowEpisodes = { watched: EpisodeRef[]; aired: EpisodeRef[]; provisionalCount: number };

export async function loadShowEpisodes(userId: string, mediaId: string): Promise<ShowEpisodes> {
  const [byUser, aired] = await Promise.all([
    watchedAndProvisional(userId, [mediaId]),
    airedEpisodeRefs([mediaId]),
  ]);
  const user = byUser.get(mediaId);
  return {
    watched: user?.watched ?? [],
    aired: aired.get(mediaId) ?? [],
    provisionalCount: user?.provisionalCount ?? 0,
  };
}

export async function listShowProgress(
  userId: string,
  mediaIds: readonly string[],
): Promise<Map<string, ShowProgress>> {
  const ids = [...new Set(mediaIds)];
  if (ids.length === 0) return new Map();

  const [byUser, aired] = await Promise.all([
    watchedAndProvisional(userId, ids),
    airedEpisodeRefs(ids),
  ]);

  const progress = new Map<string, ShowProgress>();
  for (const mediaId of ids) {
    const user = byUser.get(mediaId);
    progress.set(
      mediaId,
      deriveShowProgress(
        user?.watched ?? [],
        aired.get(mediaId) ?? [],
        user?.provisionalCount ?? 0,
      ),
    );
  }
  return progress;
}
