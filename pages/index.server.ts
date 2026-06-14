import { defineHandler } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { listMedia } from "@/domain/catalog/media";
import { entriesWithProgress } from "@/domain/tracking/library-entries";
import { getUserSettings } from "@/domain/user";
import type { RatingSystem } from "@/domain/rating";

export type Props = InferProps<typeof loader>;

// Home is the library for a signed-in user; a pitch over the catalog for a guest.
// Continue watching is derived from the same entries.
export const loader = defineHandler(async () => {
  const user = getUser();

  const [entries, settings] = user
    ? await Promise.all([entriesWithProgress(user.id), getUserSettings(user.id)])
    : [[], null];

  // Members browse through /search; guests need catalog rows for the landing page.
  const catalog = user ? [] : await listMedia({ limit: 24 });

  return {
    user,
    entries,
    catalog,
    ratingSystem: (settings?.ratingSystem ?? "score100") as RatingSystem,
  };
});
