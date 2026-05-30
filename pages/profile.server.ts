import { defineHandler } from "void";
import type { InferProps } from "void";
import { requireAuth } from "void/auth";
import { eq } from "drizzle-orm";
import { db } from "void/db";
import { favoriteMedia, favoritePeople, media, people } from "../db/schema";
import {
  getProfileActivityCalendar,
  getProfileFormatStats,
  listProfileActivity,
} from "../src/domain/profile-stats";
import { getUserSettings } from "../src/domain/user";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const user = requireAuth(c);

  const [favorites, favPeople, settings, formatStats, activityCalendar, recentActivity] =
    await Promise.all([
      db
        .select({ mediaId: favoriteMedia.mediaId, media })
        .from(favoriteMedia)
        .innerJoin(media, eq(favoriteMedia.mediaId, media.id))
        .where(eq(favoriteMedia.userId, user.id)),
      db
        .select({
          personId: people.id,
          name: people.name,
          slug: people.slug,
          profilePath: people.profilePath,
        })
        .from(favoritePeople)
        .innerJoin(people, eq(favoritePeople.personId, people.id))
        .where(eq(favoritePeople.userId, user.id)),
      getUserSettings(user.id),
      getProfileFormatStats(user.id),
      getProfileActivityCalendar(user.id),
      listProfileActivity(user.id),
    ]);

  return {
    user,
    favoriteMedia: favorites,
    favoritePeople: favPeople,
    formatStats,
    activityCalendar,
    recentActivity,
    ratingSystem: settings.ratingSystem,
  };
});
