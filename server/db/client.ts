import Database from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import { D1Dialect } from "kysely-d1";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { DatabaseSchema } from "./schema.ts";

export type AppDb = Kysely<DatabaseSchema>;
export type SqlDatabase = AppDb;

let localDb: AppDb | null = null;

function createLocalDb(): AppDb {
  const path = resolve(process.cwd(), ".data/movie/d1.sqlite");
  mkdirSync(dirname(path), { recursive: true });

  return new Kysely<DatabaseSchema>({
    dialect: new SqliteDialect({ database: new Database(path) }),
  });
}

export async function getDb(event?: { context?: Record<string, any> }): Promise<AppDb> {
  const cloudflareEnv = event?.context?.cloudflare?.env;
  const d1 = cloudflareEnv?.DB || cloudflareEnv?.MOVIE_DB;

  if (d1) {
    return new Kysely<DatabaseSchema>({
      dialect: new D1Dialect({ database: d1 }),
    });
  }

  localDb ||= createLocalDb();
  return localDb;
}
