import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { logMovieWatch } from "../../../src/domain/activity";

function isOccurredOn(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json<{
    mediaId?: unknown;
    occurredAt?: unknown;
    occurredOn?: unknown;
  }>();

  if (
    typeof body.mediaId !== "string" ||
    typeof body.occurredAt !== "number" ||
    !Number.isFinite(body.occurredAt) ||
    !isOccurredOn(body.occurredOn)
  ) {
    return c.json({ error: "Invalid payload" }, 400);
  }

  try {
    const entry = await logMovieWatch({
      userId: user.id,
      mediaId: body.mediaId,
      occurredAt: body.occurredAt,
      occurredOn: body.occurredOn,
    });
    return c.json({ ok: true, entry });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to log watch";
    return c.json({ error: message }, 400);
  }
});
