import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { httpStatusFor, type TrackingError } from "../../../src/domain/errors";
import { logMovieWatch } from "../../../src/domain/tracking/watch-log";

export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json<{ mediaId?: unknown; watchedAt?: unknown }>();

  if (typeof body.mediaId !== "string") {
    const error: TrackingError = {
      kind: "invalid_payload",
      field: "mediaId",
      reason: "must be a string",
    };
    return c.json({ error }, httpStatusFor(error));
  }

  const watchedAt = typeof body.watchedAt === "number" ? body.watchedAt : undefined;
  const result = await logMovieWatch({ userId: user.id, mediaId: body.mediaId, watchedAt });
  if (!result.ok) {
    return c.json({ error: result.error }, httpStatusFor(result.error));
  }
  return c.json({ ok: true, entry: result.value });
});
