import { getDb } from "../../db/client";
import { migrateDb } from "../../db/migrate";
import { searchEntities, upsertEntities } from "../../media/repository";
import { searchTmdb } from "../../media/tmdb-client";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const q = typeof query.q === "string" ? query.q.trim() : "";
  const type = query.type === "movie" || query.type === "show" ? query.type : undefined;
  const limit = typeof query.limit === "string" ? Number.parseInt(query.limit, 10) : 20;
  const db = await getDb(event);
  await migrateDb(db);

  const local = await searchEntities(db, { q, type, limit });
  if (!q || local.length >= Math.min(limit, 5)) {
    return { source: "d1", entries: local };
  }

  try {
    await upsertEntities(db, await searchTmdb(db, { q, type }));
    return { source: "tmdb_import", entries: await searchEntities(db, { q, type, limit }) };
  } catch (error) {
    if (local.length) {
      return { source: "d1_stale", entries: local };
    }
    throw error;
  }
});
