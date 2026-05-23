import { getSession } from "./sessions";

export async function requireAuth(event: any) {
  const session = await getSession(event);
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "authentication_required" });
  }
  return session;
}
