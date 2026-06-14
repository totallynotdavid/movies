import { defineHandler } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { getUserSettings } from "@/domain/user";
import { searchCatalog } from "@/services/media-catalog";
import type { RatingSystem } from "@/domain/rating";

export type Props = InferProps<typeof loader>;

// Server-renders results for a shareable `/search?q=...` URL so arriving with a
// query shows hits immediately; the page re-runs client-side as the query changes.
export const loader = defineHandler(async (c) => {
  const user = getUser();
  const query = c.req.query("q")?.trim() ?? "";

  const [settings, results] = await Promise.all([
    user ? getUserSettings(user.id) : Promise.resolve(null),
    searchCatalog({ query, limit: 40 }),
  ]);

  return {
    query,
    ratingSystem: (settings?.ratingSystem ?? "score100") as RatingSystem,
    results,
  };
});
