import { getDb } from "../../db/client.ts";
import { getSession } from "../../auth/sessions.ts";

export default defineEventHandler(async (event) => {
  const db = await getDb(event);
  const session = await getSession(db, event);
  return { user: session?.user || null };
});
