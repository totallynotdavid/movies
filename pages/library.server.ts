import { defineHandler } from "void";
import type { InferProps } from "void";
import { requireAuth } from "void/auth";
import { listLibraryForUser } from "../src/domain/library";
import { getUserSettings } from "../src/domain/user";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const user = requireAuth(c);
  const [entries, settings] = await Promise.all([
    listLibraryForUser(user.id),
    getUserSettings(user.id),
  ]);
  return { entries, user, ratingSystem: settings.ratingSystem };
});
