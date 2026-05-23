import { searchEntities } from "../../media/repository";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const type = query.type === "movie" || query.type === "show" ? query.type : undefined;
  const limit = typeof query.limit === "string" ? Number.parseInt(query.limit, 10) : undefined;

  const entries = await searchEntities({ type, limit: Number.isFinite(limit) ? limit : undefined });
  const movies = await searchEntities({ type: "movie", limit: 1_000 });
  const shows = await searchEntities({ type: "show", limit: 1_000 });

  return {
    seeded: entries.length > 0,
    generatedAt: entries[0]?.fetchedAt || null,
    counts: { movies: movies.length, shows: shows.length },
    entries,
  };
});
