import { getDb } from "./client";
import { migrateDb } from "./migrate";

const db = await getDb();
await migrateDb(db);
console.log(`Applied ${new Date().toISOString()} D1 schema plan.`);
