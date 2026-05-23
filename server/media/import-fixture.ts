import type { MediaSeedCatalog } from "#shared/types/media";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { mapSeedEntity } from "./tmdb-mapper";
import { upsertEntities } from "./repository";

export async function importSeedFixture(): Promise<{ inserted: number }> {
  const seedPath = resolve(process.cwd(), "server/assets/seed/tmdb-media.seed.json");
  const catalog: MediaSeedCatalog = JSON.parse(await readFile(seedPath, "utf8"));
  const entities = catalog.entries.map(mapSeedEntity);
  await upsertEntities(entities);
  return { inserted: entities.length };
}
