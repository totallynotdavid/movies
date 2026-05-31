import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { httpStatusFor, type TrackingError } from "../../../src/domain/errors";
import { logEpisodeWatch } from "../../../src/domain/tracking/watch-log";
import type { EpisodeRef } from "../../../src/domain/tracking/watch-state";

type Body = {
  mediaId?: unknown;
  seasonNumber?: unknown;
  episodeNumber?: unknown;
  watchedAt?: unknown;
};

export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json<Body>();

  if (typeof body.mediaId !== "string") {
    const error: TrackingError = {
      kind: "invalid_payload",
      field: "mediaId",
      reason: "must be a string",
    };
    return c.json({ error }, httpStatusFor(error));
  }

  // An explicit episode is optional: omit it to quick-log the next aired episode.
  // Both numbers must be present together.
  let episode: EpisodeRef | undefined;
  if (body.seasonNumber !== undefined || body.episodeNumber !== undefined) {
    if (typeof body.seasonNumber !== "number" || typeof body.episodeNumber !== "number") {
      const error: TrackingError = {
        kind: "invalid_payload",
        field: "episode",
        reason: "seasonNumber and episodeNumber must both be numbers",
      };
      return c.json({ error }, httpStatusFor(error));
    }
    episode = { seasonNumber: body.seasonNumber, episodeNumber: body.episodeNumber };
  }

  const watchedAt = typeof body.watchedAt === "number" ? body.watchedAt : undefined;

  const result = await logEpisodeWatch({
    userId: user.id,
    mediaId: body.mediaId,
    episode,
    watchedAt,
  });
  if (!result.ok) {
    return c.json({ error: result.error }, httpStatusFor(result.error));
  }

  // Progress was derived during the write; return it so the client doesn't
  // re-implement it and the server doesn't re-query it.
  return c.json({
    ok: true,
    entry: result.value.entry,
    watchedEpisodeCount: result.value.progress.watchedEpisodeCount,
  });
});
