import { defineHandler } from "void";
import type { InferProps } from "void";
import { requireAuth } from "void/auth";
import { entriesWithProgress } from "@/domain/tracking/library-entries";
import { getUserSettings } from "@/domain/user";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const user = requireAuth(c);
  const [entries, settings] = await Promise.all([
    entriesWithProgress(user.id),
    getUserSettings(user.id),
  ]);
  return { entries, user, ratingSystem: settings.ratingSystem };
});
