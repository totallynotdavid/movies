import { defineHandler } from "void";
import type { InferProps } from "void";
import { requireAuth } from "void/auth";
import { getUserProfile } from "@/domain/user";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const user = requireAuth(c);
  const profile = await getUserProfile(user.id);
  if (!profile) return c.notFound();
  return { profile };
});
