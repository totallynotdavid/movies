import { defineHandler } from "void";
import { getUser } from "void/auth";
import { findMedia } from "@/domain/catalog/media";
import { httpStatusFor, type TrackingError } from "@/domain/errors";
import { buildShowView } from "@/domain/tracking/show-view";

// Public endpoint: signed-out viewers receive episode data without per-user marks.
export const GET = defineHandler(async (c) => {
  const mediaId = c.req.query("mediaId");
  if (!mediaId) {
    const error: TrackingError = {
      kind: "invalid_payload",
      field: "mediaId",
      reason: "must be provided",
    };
    return c.json({ error }, httpStatusFor(error));
  }

  const media = await findMedia(mediaId);
  if (!media.ok) {
    return c.json({ error: media.error }, httpStatusFor(media.error));
  }
  if (media.value.mediaType !== "show") {
    const error: TrackingError = {
      kind: "wrong_media_type",
      expected: "show",
      actual: media.value.mediaType,
    };
    return c.json({ error }, httpStatusFor(error));
  }

  const user = getUser();
  return buildShowView(user?.id ?? null, media.value);
});
