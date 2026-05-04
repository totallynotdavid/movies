import { safeParse } from "valibot";
import { MarkMovieWatchedSchema } from "#shared/schemas/tracking";
import { getDb } from "../../../../db/client";
import { requireAuth } from "../../../../auth/require-auth";
import { validateCsrf } from "../../../../auth/csrf";
import { upsertMovieWatched } from "../../../../tracking/repository";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "missing entity id" });
  }

  const body = await readBody(event);
  const parsed = safeParse(MarkMovieWatchedSchema, body);
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "invalid payload" });
  }

  await validateCsrf(event);
  const db = await getDb(event);
  const auth = await requireAuth(event, db);
  const entry = await upsertMovieWatched(db, {
    userId: auth.user.id,
    entityId: id,
    score100: parsed.output.score100,
    watchedOn: parsed.output.watchedOn,
  });

  return { entry };
});
