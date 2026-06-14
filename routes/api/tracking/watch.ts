import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { attempt } from "@/result";
import { httpStatusFor, type TrackingError } from "@/domain/errors";
import { recordWatch } from "@/domain/tracking/commands";
import { parseMediaRef, resolveMediaId } from "@/services/media-catalog";
import type { EpisodeRef } from "@/shared/tracking";

type Body = {
  media?: unknown;
  seasonNumber?: unknown;
  episodeNumber?: unknown;
  watchedAt?: unknown;
};

export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json<Body>();

  const ref = parseMediaRef(body.media);
  if (!ref.ok) return c.json({ error: ref.error }, httpStatusFor(ref.error));

  const resolved = await attempt(
    resolveMediaId(ref.value),
    (cause): TrackingError => ({ kind: "invalid_payload", field: "media", reason: String(cause) }),
  );
  if (!resolved.ok) return c.json({ error: resolved.error }, httpStatusFor(resolved.error));

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

  const result = await recordWatch(user.id, resolved.value, episode, watchedAt);
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
