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
} from "../domain/media";
import { personStubsWrite } from "../domain/people";
import { mediaCreditsWrite } from "../domain/credits";
import { mediaCompaniesWrite, mediaGenresWrite, mediaTitlesWrite } from "../domain/media-metadata";
import {
  markEpisodesFailedWrite,
  markEpisodesFreshWrite,
  mediaEpisodesWrite,
} from "../domain/episodes";
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

// Tier-1: one TMDB detail call written as a single atomic batch (scalars +
// credits + metadata + freshness marker). Idempotent; never throws to the
// caller. Failure is returned as an outcome and recorded durably.
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

// Tier-2: season-detail fan-out for episode runtimes/air dates. Runs in the
// queue consumer.
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

// Single trigger used by the request loader. Block only when there is nothing to
// show (a bare stub); fresh/stale/failed render what we already have. Refreshing
// stale/failed is the reconcile cron's job, not the request path's, so a view
// never enqueues, which is what removes the per-view refresh amplification.
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

// Drains the not-fresh media backlog off the request path (run by the reconcile
// cron). Bounded per run; the queue + bounded retry absorb pacing and failures.
// Most-popular first, so the titles users are likeliest to open warm soonest.
const RECONCILE_BATCH = 50;

export async function reconcileMediaDetails(): Promise<number> {
  const due = await listMediaNeedingDetails(DETAILS_TTL_MS, RECONCILE_BATCH);
  for (const item of due) await enqueue({ kind: "media-details", mediaId: item.id });
  return due.length;
}

// Dispatches a queued hydration job to the matching operation.
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

// Best-effort: recording a failure must not itself throw out of the operation,
// or a DB hiccup on the error path would escape into a loader that has no
// try/catch.
async function recordFailure(statements: Statement[]): Promise<void> {
  try {
    await runBatch(statements);
  } catch (cause) {
    logger.warn("failed to record hydration error", { cause });
  }
}
