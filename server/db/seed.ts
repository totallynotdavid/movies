import { getDb } from "./client";
import { migrateDb } from "./migrate";
import { countEntities } from "../media/repository";
import { importSeedFixture } from "../media/import-fixture";
import { hashPassword } from "../auth/sessions";

const db = await getDb();
await migrateDb(db);

const now = new Date().toISOString();
const existingDevUser = await db
  .selectFrom("users")
  .select("id")
  .where("email", "=", "dev@example.com")
  .executeTakeFirst();

if (!existingDevUser) {
  await db
    .insertInto("users")
    .values({
      id: crypto.randomUUID(),
      email: "dev@example.com",
      username: "dev",
      password_hash: await hashPassword("password"),
      score_system: "100",
      is_admin: 1,
      is_excluded_from_aggregation: 0,
      created_at: now,
      updated_at: now,
    })
    .execute();
}

const count = await countEntities(db);
if (count > 0) {
  console.log(`Seed skipped; ${count} entities already exist.`);
} else {
  const result = await importSeedFixture(db);
  console.log(`Seeded ${result.inserted} fixture entities.`);
}
