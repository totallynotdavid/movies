import { defineHandler } from "void";
import type { InferProps } from "void";
import { requireAuth } from "void/auth";
import { eq } from "drizzle-orm";
import { db } from "void/db";
import { media, userFavoriteActors, userFavoriteMedia } from "../db/schema";
import {
  getProfileActivityCalendar,
  getProfileFormatStats,
  listProfileActivity,
} from "../src/domain/activity";
import { getUserSettings } from "../src/domain/library";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const user = requireAuth(c);

  const [favoriteMedia, favoriteActors, settings, formatStats, activityCalendar, recentActivity] =
    await Promise.all([
      db
        .select({ mediaId: userFavoriteMedia.mediaId, media })
        .from(userFavoriteMedia)
        .innerJoin(media, eq(userFavoriteMedia.mediaId, media.id))
        .where(eq(userFavoriteMedia.userId, user.id)),
      db.select().from(userFavoriteActors).where(eq(userFavoriteActors.userId, user.id)),
      getUserSettings(user.id),
      getProfileFormatStats(user.id),
      getProfileActivityCalendar(user.id),
      listProfileActivity(user.id),
    ]);

  return {
    user,
    favoriteMedia,
    favoriteActors,
    formatStats,
    activityCalendar,
    recentActivity,
    ratingSystem: settings.ratingSystem,
  };
});
