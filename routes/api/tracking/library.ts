import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { err, ok, type Result } from "@/result";
import type { TrackingError } from "@/domain/errors";
import { httpStatusFor } from "@/domain/errors";
import { entriesWithProgress } from "@/domain/tracking/library-entries";
import { saveEntry } from "@/domain/tracking/commands";
import { parseLibraryStatus, type LibraryStatus } from "@/shared/tracking";

type LibraryBody = {
  mediaId: string;
  status: LibraryStatus;
  score100?: number | null;
};

function parseLibraryBody(body: Record<string, unknown>): Result<LibraryBody, TrackingError> {
  if (typeof body.mediaId !== "string") {
    return err({ kind: "invalid_payload", field: "mediaId", reason: "must be a string" });
  }
  const status = parseLibraryStatus(body.status);
  if (!status) {
    return err({ kind: "invalid_payload", field: "status", reason: "unknown status" });
  }

  const parsed: LibraryBody = { mediaId: body.mediaId, status };
  if (body.score100 !== undefined) {
    if (body.score100 !== null && typeof body.score100 !== "number") {
      return err({
        kind: "invalid_payload",
        field: "score100",
        reason: "must be a number or null",
      });
    }
    parsed.score100 = body.score100;
  }
  return ok(parsed);
}

export const GET = defineHandler(async (c) => {
  const user = requireAuth(c);
  const entries = await entriesWithProgress(user.id);
  return { entries };
});

// Intent surface: status/score changes and adding to the library. Filing a
// status never logs a watch; recording a watch lives on /api/tracking/watch.
export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json<Record<string, unknown>>();

  const parsed = parseLibraryBody(body);
  if (!parsed.ok) {
    return c.json({ error: parsed.error }, httpStatusFor(parsed.error));
  }

  const { mediaId, status, score100 } = parsed.value;
  const result = await saveEntry(user.id, mediaId, { status, score100 });
  if (!result.ok) {
    return c.json({ error: result.error }, httpStatusFor(result.error));
  }
  return c.json({ ok: true, entry: result.value });
});
