import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { attempt, err, ok, type Result } from "@/result";
import type { TrackingError } from "@/domain/errors";
import { httpStatusFor } from "@/domain/errors";
import { entriesWithProgress } from "@/domain/tracking/library-entries";
import { removeEntry, saveEntry } from "@/domain/tracking/commands";
import { parseMediaRef, resolveMediaId } from "@/services/media-catalog";
import type { MediaRef } from "@/shared/tracking";
import { parseLibraryStatus, type LibraryStatus } from "@/shared/library-status";

// A patch: status and score are independently optional, so the score control can
// post a score without resending status (and vice versa). Both omitted is a
// no-op-shaped request the domain still treats as "ensure tracked".
type LibraryBody = {
  media: MediaRef;
  filedStatus?: LibraryStatus;
  score100?: number | null;
};

function parseLibraryBody(body: Record<string, unknown>): Result<LibraryBody, TrackingError> {
  const ref = parseMediaRef(body.media);
  if (!ref.ok) return ref;

  const parsed: LibraryBody = { media: ref.value };

  if (body.status !== undefined) {
    const status = parseLibraryStatus(body.status);
    if (!status) {
      return err({ kind: "invalid_payload", field: "status", reason: "unknown status" });
    }
    parsed.filedStatus = status;
  }

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

export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json<Record<string, unknown>>();

  const parsed = parseLibraryBody(body);
  if (!parsed.ok) {
    return c.json({ error: parsed.error }, httpStatusFor(parsed.error));
  }

  const { media, filedStatus, score100 } = parsed.value;
  const resolved = await attempt(
    resolveMediaId(media),
    (cause): TrackingError => ({ kind: "invalid_payload", field: "media", reason: String(cause) }),
  );
  if (!resolved.ok) return c.json({ error: resolved.error }, httpStatusFor(resolved.error));

  const result = await saveEntry(user.id, resolved.value, { filedStatus, score100 });
  if (!result.ok) {
    return c.json({ error: result.error }, httpStatusFor(result.error));
  }
  return c.json({ ok: true, entry: result.value });
});

export const DELETE = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json<Record<string, unknown>>();

  const ref = parseMediaRef(body.media);
  if (!ref.ok) return c.json({ error: ref.error }, httpStatusFor(ref.error));

  const resolved = await attempt(
    resolveMediaId(ref.value),
    (cause): TrackingError => ({ kind: "invalid_payload", field: "media", reason: String(cause) }),
  );
  if (!resolved.ok) return c.json({ error: resolved.error }, httpStatusFor(resolved.error));

  const result = await removeEntry(user.id, resolved.value);
  if (!result.ok) return c.json({ error: result.error }, httpStatusFor(result.error));
  return c.json({ ok: true });
});
