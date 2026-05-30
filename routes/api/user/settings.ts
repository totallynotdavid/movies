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
  const body = await c.req.json<{ ratingSystem?: unknown }>();
  const ratingSystem = parseRatingSystem(body.ratingSystem);
  const updated = await updateUserSettings(user.id, { ratingSystem });
  return c.json(updated);
});
