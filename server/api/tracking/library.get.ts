import { getDb } from "../../db/client.ts";
import { requireAuth } from "../../auth/require-auth.ts";
import { listLibraryEntries } from "../../tracking/repository.ts";

export default defineEventHandler(async (event) => {
  const db = await getDb(event);
  const auth = await requireAuth(event, db);

  return {
    entries: await listLibraryEntries(db, auth.user.id),
  };
});
