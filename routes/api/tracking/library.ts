import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { saveLibraryEntrySnapshot } from "../../../src/domain/activity";
import { listLibraryForUser, parseLibraryStatus } from "../../../src/domain/library";

function hasOwn(body: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

export const GET = defineHandler(async (c) => {
  const user = requireAuth(c);
  const entries = await listLibraryForUser(user.id);
  return { entries };
});

export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json<Record<string, unknown>>();
  const status = parseLibraryStatus(body.status);
  const score100 =
    hasOwn(body, "score100") && (typeof body.score100 === "number" || body.score100 === null)
      ? (body.score100 as number | null)
      : undefined;
  const progressCurrent =
    typeof body.progressCurrent === "number" ? body.progressCurrent : undefined;
  const progressTotal =
    hasOwn(body, "progressTotal") &&
    (typeof body.progressTotal === "number" || body.progressTotal === null)
      ? (body.progressTotal as number | null)
      : undefined;
  const notes =
    hasOwn(body, "notes") && (typeof body.notes === "string" || body.notes === null)
      ? (body.notes as string | null)
      : undefined;

  if (typeof body.mediaId !== "string" || !status) {
    return c.json({ error: "Invalid payload" }, 400);
  }

  const entry = await saveLibraryEntrySnapshot({
    userId: user.id,
    mediaId: body.mediaId,
    status,
    score100,
    progressCurrent,
    progressTotal,
    notes,
  });

  return c.json({ ok: true, entry });
});
