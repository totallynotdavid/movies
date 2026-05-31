import { defineHandler } from "void";
import { listMedia } from "../../../src/domain/catalog/media";

export const GET = defineHandler(async (c) => {
  const typeInput = c.req.query("type");
  const limitInput = c.req.query("limit");

  const type = typeInput === "movie" || typeInput === "show" ? typeInput : undefined;
  const limit = limitInput ? Number.parseInt(limitInput, 10) : undefined;

  const entries = await listMedia({ type, limit: Number.isFinite(limit) ? limit : 20 });

  c.header("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return {
    seeded: entries.length > 0,
    counts: {
      total: entries.length,
      movies: entries.filter((entry) => entry.mediaType === "movie").length,
      shows: entries.filter((entry) => entry.mediaType === "show").length,
    },
    entries,
  };
});
