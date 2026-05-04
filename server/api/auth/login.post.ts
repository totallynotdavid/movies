import { getDb } from "../../db/client";
import { migrateDb } from "../../db/migrate";
import { createSession, findUserByLogin, verifyPassword } from "../../auth/sessions";
import { recordFailedLogin, resetLoginThrottle } from "../../auth/throttle";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ login?: string; password?: string }>(event);
  const login = body?.login?.trim();
  const password = body?.password || "";
  if (!login || !password) {
    throw createError({ statusCode: 400, statusMessage: "invalid_login_payload" });
  }

  const db = await getDb(event);
  await migrateDb(db);
  const loginUser = await findUserByLogin(db, login);
  const valid = loginUser ? await verifyPassword(password, loginUser.passwordHash) : false;

  if (!loginUser || !valid) {
    await recordFailedLogin(db, login.toLowerCase());
    throw createError({ statusCode: 401, statusMessage: "invalid_credentials" });
  }

  await resetLoginThrottle(db, login.toLowerCase());
  return await createSession(db, event, loginUser.user);
});
