import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { err, ok, type Result } from "../../../src/result";
import type { TrackingError } from "../../../src/domain/errors";
import { httpStatusFor } from "../../../src/domain/errors";
import {
  listLibraryForUser,
  parseLibraryStatus,
  upsertLibraryEntry,
} from "../../../src/domain/library";
import type { LibraryStatus } from "../../../src/domain/library";

type LibraryBody = {
  mediaId: string;
  status: LibraryStatus;
  score100?: number | null;
  notes?: string | null;
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
  if (body.notes !== undefined) {
    if (body.notes !== null && typeof body.notes !== "string") {
      return err({ kind: "invalid_payload", field: "notes", reason: "must be a string or null" });
    }
    parsed.notes = body.notes;
  }

  return ok(parsed);
}

export const GET = defineHandler(async (c) => {
  const user = requireAuth(c);
  const entries = await listLibraryForUser(user.id);
  return { entries };
});

export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json<Record<string, unknown>>();

  const parsed = parseLibraryBody(body);
  if (!parsed.ok) {
    return c.json({ error: parsed.error }, httpStatusFor(parsed.error));
  }

  const result = await upsertLibraryEntry({ userId: user.id, ...parsed.value });
  if (!result.ok) {
    return c.json({ error: result.error }, httpStatusFor(result.error));
  }
  return c.json({ ok: true, entry: result.value });
});
