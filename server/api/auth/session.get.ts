import { getSession } from "../../auth/sessions";

export default defineEventHandler(async (event) => {
  const session = await getSession(event);
  return { user: session?.user || null };
});
