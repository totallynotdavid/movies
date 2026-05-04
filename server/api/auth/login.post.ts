import { getDb } from "../../db/client.ts";
import { migrateDb } from "../../db/migrate.ts";
import { createSession, findUserByLogin, verifyPassword } from "../../auth/sessions.ts";
import { recordFailedLogin, resetLoginThrottle } from "../../auth/throttle.ts";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ login?: string; password?: string }>(event);
  const login = body?.login?.trim();
  const password = body?.password || "";
  if (!login || !password) {
    throw createError({ statusCode: 400, statusMessage: "invalid_login_payload" });
  }

  const db = await getDb(event);
  await migrateDb(db);
  const user = await findUserByLogin(db, login);
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !valid) {
    await recordFailedLogin(db, login.toLowerCase());
    throw createError({ statusCode: 401, statusMessage: "invalid_credentials" });
  }

  await resetLoginThrottle(db, login.toLowerCase());
  const { passwordHash, ...authUser } = user;
  return await createSession(db, event, authUser);
});
