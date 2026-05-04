import { getDb } from "../../db/client";
import { requireAuth } from "../../auth/require-auth";
import { listLibraryEntries } from "../../tracking/repository";

export default defineEventHandler(async (event) => {
  const db = await getDb(event);
  const auth = await requireAuth(event, db);

  return {
    entries: await listLibraryEntries(db, auth.user.id),
  };
});
