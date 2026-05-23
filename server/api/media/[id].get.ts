import { getEntityById, upsertEntity } from "../../media/repository";
import { getTmdbDetails } from "../../media/tmdb-client";

function parseTmdbId(id: string): { type: "movie" | "show"; tmdbId: number } | null {
  const match = /^tmdb:(movie|show):(\d+)$/.exec(id);
  if (!match) return null;
  return { type: match[1] as "movie" | "show", tmdbId: Number(match[2]) };
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "missing_entity_id" });

  const local = await getEntityById(id);
  if (local) return { entry: local };

  const parsed = parseTmdbId(id);
  if (parsed) {
    const details = await getTmdbDetails(parsed.type, parsed.tmdbId);
    if (details) return { entry: await upsertEntity(details) };
  }

  throw createError({ statusCode: 404, statusMessage: "entity_not_found" });
});
