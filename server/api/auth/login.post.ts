import { createSession, findUserByLogin, verifyPassword } from "../../auth/sessions";
import { recordFailedLogin, resetLoginThrottle } from "../../auth/throttle";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ login?: string; password?: string }>(event);
  const login = body?.login?.trim();
  const password = body?.password || "";
  if (!login || !password) {
    throw createError({ statusCode: 400, statusMessage: "invalid_login_payload" });
  }

  const loginUser = await findUserByLogin(login);
  const valid = loginUser ? await verifyPassword(password, loginUser.passwordHash) : false;

  if (!loginUser || !valid) {
    await recordFailedLogin(login.toLowerCase());
    throw createError({ statusCode: 401, statusMessage: "invalid_credentials" });
  }

  await resetLoginThrottle(login.toLowerCase());
  return createSession(event, loginUser.user);
});
