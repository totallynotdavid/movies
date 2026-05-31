import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { captureTimeZone } from "../../../src/domain/user";

// First-run capture of the browser's IANA zone. Set-if-null on the server, so a
// repeated call (e.g. a new device) never overwrites an explicit setting.
export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json<{ timeZone?: unknown }>();

  if (typeof body.timeZone !== "string" || body.timeZone.length === 0) {
    return c.json({ error: "invalid timeZone" }, 400);
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: body.timeZone });
  } catch {
    return c.json({ error: "invalid timeZone" }, 400);
  }

  await captureTimeZone(user.id, body.timeZone);
  return c.json({ ok: true });
});
