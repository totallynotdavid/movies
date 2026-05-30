import { defineHandler } from "void";
import type { InferProps } from "void";
import { requireAuth } from "void/auth";
import { getUserSettings } from "../src/domain/user";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const user = requireAuth(c);
  const settings = await getUserSettings(user.id);
  return { user, role: c.get("role"), ratingSystem: settings.ratingSystem };
});
