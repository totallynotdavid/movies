import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import {
  listLibraryForUser,
  parseLibraryStatus,
  upsertLibraryEntry,
} from "../../../src/domain/library";

export const GET = defineHandler(async (c) => {
  const user = requireAuth(c);
  const entries = await listLibraryForUser(user.id);
  return { entries };
});

export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json<{
    mediaId?: string;
    status?: unknown;
    score100?: unknown;
    progressCurrent?: unknown;
    progressTotal?: unknown;
    notes?: unknown;
  }>();
  const status = parseLibraryStatus(body.status);
  const score100 = typeof body.score100 === "number" ? body.score100 : undefined;
  const progressCurrent =
    typeof body.progressCurrent === "number" ? body.progressCurrent : undefined;
  const progressTotal = typeof body.progressTotal === "number" ? body.progressTotal : undefined;
  const notes = typeof body.notes === "string" ? body.notes : undefined;

  if (!body.mediaId || !status) {
    return c.json({ error: "Invalid payload" }, 400);
  }

  await upsertLibraryEntry({
    userId: user.id,
    mediaId: body.mediaId,
    status,
    score100,
    progressCurrent,
    progressTotal,
    notes,
  });

  return c.json({ ok: true });
});
