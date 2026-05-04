import { getDb } from "./client.ts";
import { migrateDb } from "./migrate.ts";

const db = await getDb();
await migrateDb(db);
console.log(`Applied ${new Date().toISOString()} D1 schema plan.`);
