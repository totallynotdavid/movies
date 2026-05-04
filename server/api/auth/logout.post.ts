import { clearAuthCookies } from "../../auth/cookies.ts";

export default defineEventHandler(async (event) => {
  clearAuthCookies(event);
  return { ok: true };
});
