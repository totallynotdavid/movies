import { getDb } from "../../db/client.ts";
import { migrateDb } from "../../db/migrate.ts";
import { searchEntities } from "../../media/repository.ts";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const type = query.type === "movie" || query.type === "show" ? query.type : undefined;
  const limit = typeof query.limit === "string" ? Number.parseInt(query.limit, 10) : undefined;
  const db = await getDb(event);
  await migrateDb(db);
  const entries = await searchEntities(db, {
    type,
    limit: Number.isFinite(limit) ? limit : undefined,
  });
  const movies = await searchEntities(db, { type: "movie", limit: 1_000 });
  const shows = await searchEntities(db, { type: "show", limit: 1_000 });

  return {
    seeded: entries.length > 0,
    generatedAt: entries[0]?.fetchedAt || null,
    counts: { movies: movies.length, shows: shows.length },
    entries,
  };
});
