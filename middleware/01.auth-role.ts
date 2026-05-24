import { defineMiddleware } from "void";
import { getUser } from "void/auth";
import { ensureProfileForAuthUser, getUserRole, type UserRole } from "../src/domain/library";

export default defineMiddleware(async (c, next) => {
  const user = getUser();

  if (!user) {
    c.set("role", "anonymous" satisfies UserRole);
    await next();
    return;
  }

  await ensureProfileForAuthUser({ id: user.id, email: user.email, name: user.name });
  const role = await getUserRole(user.id);
  c.set("role", role);

  await next();
});
