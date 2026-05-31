import { queues } from "void/queues";
import { logger } from "void/log";
import {
  fetchMovieDetail,
  fetchSeasonEpisodes,
  fetchShowDetail,
  tmdbToken,
} from "../integrations/tmdb";
import {
  findMedia,
  listMediaNeedingDetails,
  markDetailsFailedWrite,
  mediaScalarsWrite,
  type MediaRecord,
} from "../domain/catalog/media";
import { personStubsWrite } from "../domain/catalog/people";
import { mediaCreditsWrite } from "../domain/catalog/credits";
import {
  mediaCompaniesWrite,
  mediaGenresWrite,
  mediaTitlesWrite,
} from "../domain/catalog/metadata";
import {
  markEpisodesFailedWrite,
  markEpisodesFreshWrite,
  mediaEpisodesWrite,
} from "../domain/catalog/episodes";
import { runBatch, type Statement } from "../db/kernel";
import {
  DETAILS_TTL_MS,
  EPISODES_TTL_MS,
  hydrationState,
  summarizeCause,
} from "../domain/hydration";
import { attempt } from "../result";
import type {
  EpisodeHydrationMessage,
  EpisodeInput,
  HydrationMessage,
} from "../../shared/types/metadata";

export type HydrationError =
  | { kind: "tmdb_unavailable"; cause: unknown }
  | { kind: "persistence_failed"; cause: unknown };

export type HydrationOutcome =
  | { ok: true; skipped: boolean }
  | { ok: false; error: HydrationError };

// Tier-1 hydration. One TMDB detail call, one atomic batch write [scalars,
// credits, metadata, freshness marker]. Returns outcomes instead of throwing.
export async function hydrateMediaDetails(item: MediaRecord): Promise<HydrationOutcome> {
  if (!tmdbToken()) return { ok: true, skipped: true };
  if (hydrationState(item.detailsHydratedAt, item.detailsError, DETAILS_TTL_MS) === "fresh") {
    return { ok: true, skipped: true };
  }

  const fetched = await attempt(
    item.mediaType === "movie" ? fetchMovieDetail(item.tmdbId) : fetchShowDetail(item.tmdbId),
    (cause): HydrationError => ({ kind: "tmdb_unavailable", cause }),
  );
  if (!fetched.ok) {
    await recordFailure(markDetailsFailedWrite(item.id, summarizeCause(fetched.error.cause)));
    return { ok: false, error: fetched.error };
  }

  const detail = fetched.value;
  const written = await attempt(
    runBatch([
      ...mediaScalarsWrite(item.id, detail.scalars),
      ...personStubsWrite(detail.people),
      ...mediaCreditsWrite(item.id, detail.cast, detail.crew),
      ...mediaGenresWrite(item.id, detail.genres),
      ...mediaCompaniesWrite(item.id, detail.companies),
      ...mediaTitlesWrite(item.id, detail.titles),
    ]),
    (cause): HydrationError => ({ kind: "persistence_failed", cause }),
  );
  if (!written.ok) return { ok: false, error: written.error };

  if (
    item.mediaType === "show" &&
    detail.seasonNumbers.length > 0 &&
    hydrationState(item.episodesHydratedAt, item.episodesError, EPISODES_TTL_MS) !== "fresh"
  ) {
    await enqueue({
      kind: "media-episodes",
      mediaId: item.id,
      tmdbId: item.tmdbId,
      seasonNumbers: detail.seasonNumbers,
    });
  }
  return { ok: true, skipped: false };
}

// Tier-2 hydration for season episode data [runtime, air date]. Runs in queue
// consumers.
export async function hydrateMediaEpisodes(
  msg: EpisodeHydrationMessage,
): Promise<HydrationOutcome> {
  if (!tmdbToken()) return { ok: true, skipped: true };

  const fetched = await attempt(
    (async () => {
      const all: EpisodeInput[] = [];
      for (const seasonNumber of msg.seasonNumbers) {
        all.push(...(await fetchSeasonEpisodes(msg.tmdbId, seasonNumber)));
      }
      return all;
    })(),
    (cause): HydrationError => ({ kind: "tmdb_unavailable", cause }),
  );
  if (!fetched.ok) {
    await recordFailure(markEpisodesFailedWrite(msg.mediaId, summarizeCause(fetched.error.cause)));
    return { ok: false, error: fetched.error };
  }

  const written = await attempt(
    runBatch([
      ...mediaEpisodesWrite(msg.mediaId, fetched.value),
      ...markEpisodesFreshWrite(msg.mediaId),
    ]),
    (cause): HydrationError => ({ kind: "persistence_failed", cause }),
  );
  return written.ok ? { ok: true, skipped: false } : { ok: false, error: written.error };
}

// Request path trigger. Block only for stub state with no data. Fresh, stale,
// and failed states render existing data. Reconcile refreshes stale/failed rows
// off-request.
export async function ensureMediaDetails(item: MediaRecord): Promise<MediaRecord> {
  if (hydrationState(item.detailsHydratedAt, item.detailsError, DETAILS_TTL_MS) !== "stub") {
    return item;
  }

  const outcome = await hydrateMediaDetails(item);
  if (!outcome.ok) {
    logger.warn("media details hydration failed", { mediaId: item.id, error: outcome.error });
    return item;
  }
  if (outcome.skipped) return item;
  const refreshed = await findMedia(item.id);
  return refreshed.ok ? refreshed.value : item;
}

// Reconcile backlog drain for not-fresh media. Bounded per run. Queue retry
// absorbs pacing and failures. Uses popularity priority.
const RECONCILE_BATCH = 50;

export async function reconcileMediaDetails(): Promise<number> {
  const due = await listMediaNeedingDetails(DETAILS_TTL_MS, RECONCILE_BATCH);
  for (const item of due) await enqueue({ kind: "media-details", mediaId: item.id });
  return due.length;
}

// Dispatch queued hydration jobs to the matching operation.
export async function runHydrationMessage(message: HydrationMessage): Promise<HydrationOutcome> {
  if (message.kind === "media-episodes") return hydrateMediaEpisodes(message);

  const found = await findMedia(message.mediaId);
  if (!found.ok) return { ok: true, skipped: true }; // media gone; nothing to refresh
  return hydrateMediaDetails(found.value);
}

async function enqueue(message: HydrationMessage): Promise<void> {
  try {
    await queues["media-hydration"].send(message);
  } catch (cause) {
    logger.warn("failed to enqueue hydration", { message, cause });
  }
}

// Best-effort failure recording. Error-path DB issues must not escape.
async function recordFailure(statements: Statement[]): Promise<void> {
  try {
    await runBatch(statements);
  } catch (cause) {
    logger.warn("failed to record hydration error", { cause });
  }
}
