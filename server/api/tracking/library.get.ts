import { requireAuth } from "../../auth/require-auth";
import { listLibraryEntries } from "../../tracking/repository";

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event);
  return { entries: await listLibraryEntries(auth.user.id) };
});
