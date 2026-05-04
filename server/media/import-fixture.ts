import type { MediaSeedCatalog } from "#shared/types/media";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { SqlDatabase } from "../db/client";
import { mapSeedEntity } from "./tmdb-mapper";
import { upsertEntities } from "./repository";

export async function importSeedFixture(db: SqlDatabase): Promise<{ inserted: number }> {
  const seedPath = resolve(process.cwd(), "server/assets/seed/tmdb-media.seed.json");
  const catalog = JSON.parse(await readFile(seedPath, "utf8")) as MediaSeedCatalog;
  const entities = catalog.entries.map(mapSeedEntity);
  await upsertEntities(db, entities);
  return { inserted: entities.length };
}
