import type { SqlDatabase } from "../db/client.ts";
import { getDb } from "../db/client.ts";
import { getSession } from "./sessions.ts";

export async function requireAuth(event: any, existingDb?: SqlDatabase) {
  const db = existingDb || (await getDb(event));
  const session = await getSession(db, event);
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "authentication_required" });
  }
  return session;
}
