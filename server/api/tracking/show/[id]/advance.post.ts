import { safeParse } from "valibot";
import { AdvanceShowSchema } from "#shared/schemas/tracking";
import { getDb } from "../../../../db/client.ts";
import { requireAuth } from "../../../../auth/require-auth.ts";
import { validateCsrf } from "../../../../auth/csrf.ts";
import { advanceShow } from "../../../../tracking/repository.ts";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "missing entity id" });
  }

  const body = await readBody(event);
  const parsed = safeParse(AdvanceShowSchema, body);
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "invalid payload" });
  }

  await validateCsrf(event);
  const db = await getDb(event);
  const auth = await requireAuth(event, db);
  const { entry, conflict } = await advanceShow(db, {
    userId: auth.user.id,
    entityId: id,
    expectedNextEpisode: parsed.output.expectedNextEpisode,
    totalEpisodes: parsed.output.totalEpisodes,
  });

  if (conflict) {
    setResponseStatus(event, 409);
  }

  return {
    conflict,
    entry,
  };
});
