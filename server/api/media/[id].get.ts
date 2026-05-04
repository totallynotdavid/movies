import { getDb } from "../../db/client";
import { migrateDb } from "../../db/migrate";
import { getEntityById, upsertEntity } from "../../media/repository";
import { getTmdbDetails } from "../../media/tmdb-client";

function parseTmdbId(id: string): { type: "movie" | "show"; tmdbId: number } | null {
  const match = /^tmdb:(movie|show):(\d+)$/.exec(id);
  if (!match) return null;
  return { type: match[1] as "movie" | "show", tmdbId: Number(match[2]) };
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "missing_entity_id" });
  }

  const db = await getDb(event);
  await migrateDb(db);
  const local = await getEntityById(db, id);
  if (local) return { entry: local };

  const parsed = parseTmdbId(id);
  if (parsed) {
    const details = await getTmdbDetails(db, parsed.type, parsed.tmdbId);
    if (details) return { entry: await upsertEntity(db, details) };
  }

  throw createError({ statusCode: 404, statusMessage: "entity_not_found" });
});
