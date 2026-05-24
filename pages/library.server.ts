import { defineHandler } from "void";
import type { InferProps } from "void";
import { requireAuth } from "void/auth";
import { listLibraryForUser } from "../src/domain/library";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const user = requireAuth(c);
  const entries = await listLibraryForUser(user.id);
  return { entries, user };
});
