import { defineHandler } from "void";
import type { InferProps } from "void";
import { requireAuth } from "void/auth";
import { getUserSettings, listLibraryForUser } from "../src/domain/library";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const user = requireAuth(c);
  const [entries, settings] = await Promise.all([
    listLibraryForUser(user.id),
    getUserSettings(user.id),
  ]);
  return { entries, user, ratingSystem: settings.ratingSystem };
});
