import { defineMiddleware } from "void";
import { getUser } from "void/auth";
import { getUserContext, type UserRole } from "@/domain/user";

export default defineMiddleware(async (c, next) => {
  const user = getUser();

  if (!user) {
    c.set("role", "anonymous" satisfies UserRole);
    c.set("shared", { user: null, role: "anonymous" satisfies UserRole });
    await next();
    return;
  }

  const ctx = await getUserContext(user.id);
  c.set("role", ctx.role);
  c.set("shared", {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      username: ctx.username,
      visibility: ctx.visibility,
    },
    role: ctx.role,
  });

  await next();
});
