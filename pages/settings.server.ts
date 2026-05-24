import { defineHandler } from "void";
import type { InferProps } from "void";
import { requireAuth } from "void/auth";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler((c) => {
  const user = requireAuth(c);
  return { user, role: c.get("role") };
});
