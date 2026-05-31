import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { getUserSettings, updateUserSettings } from "../../../src/domain/user";
import { parseRatingSystem } from "../../../src/domain/rating";

export const GET = defineHandler(async (c) => {
  const user = requireAuth(c);
  const settings = await getUserSettings(user.id);
  return c.json(settings);
});

export const PATCH = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json<{ ratingSystem?: unknown; timeZone?: unknown }>();
  const updated = await updateUserSettings(user.id, {
    ratingSystem:
      body.ratingSystem !== undefined ? parseRatingSystem(body.ratingSystem) : undefined,
    timeZone: parseTimeZone(body.timeZone),
  });
  return c.json(updated);
});

// Accept only a syntactically valid IANA zone; anything else is ignored so a
// bad client payload can never null out a stored zone or break date math.
function parseTimeZone(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return undefined;
  }
}
