import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { httpStatusFor, type TrackingError } from "@/domain/errors";
import { recordWatch } from "@/domain/tracking/commands";
import type { EpisodeRef } from "@/shared/tracking";

type Body = {
  mediaId?: unknown;
  seasonNumber?: unknown;
  episodeNumber?: unknown;
  watchedAt?: unknown;
};

// Fact surface: records a watch. A movie completes; a show logs the requested
// episode, or quick-logs the next aired one when no episode is given.
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

  // An explicit episode is optional; both numbers must be present together.
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

  const result = await recordWatch(user.id, body.mediaId, episode, watchedAt);
  if (!result.ok) {
    return c.json({ error: result.error }, httpStatusFor(result.error));
  }

  // Progress was derived during the write (shows only); return it so the client
  // does not re-implement it and the server does not re-query it.
  return c.json({
    ok: true,
    entry: result.value.entry,
    watchedEpisodeCount: result.value.progress?.watchedEpisodeCount,
  });
});
