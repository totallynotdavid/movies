import { defineMiddleware } from "void";
import { getUser } from "void/auth";
import { ensureProfileForAuthUser, getUserRole, type UserRole } from "../src/domain/user";

export default defineMiddleware(async (c, next) => {
  const user = getUser();

  if (!user) {
    c.set("role", "anonymous" satisfies UserRole);
    c.set("shared", { user: null, role: "anonymous" satisfies UserRole });
    await next();
    return;
  }

  await ensureProfileForAuthUser({ id: user.id, email: user.email, name: user.name });
  const role = await getUserRole(user.id);
  c.set("role", role);
  c.set("shared", { user: { id: user.id, name: user.name, email: user.email }, role });

  await next();
});
