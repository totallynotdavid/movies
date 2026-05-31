import { defineHandler } from "void";
import type { InferProps } from "void";
import { requireAuth } from "void/auth";
import { getProfileOverview } from "../src/domain/insights/profile";
import { favoriteMediaForUser, favoritePeopleForUser } from "../src/domain/tracking/favorites";
import { getUserSettings } from "../src/domain/user";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const user = requireAuth(c);

  // One behavior-log gather drives the whole read model (stats, calendar, recent,
  // mirror); the only other reads are favorites and settings.
  const [overview, favorites, favPeople, settings] = await Promise.all([
    getProfileOverview(user.id),
    favoriteMediaForUser(user.id),
    favoritePeopleForUser(user.id),
    getUserSettings(user.id),
  ]);

  return {
    user,
    favoriteMedia: favorites,
    favoritePeople: favPeople,
    formatStats: overview.formatStats,
    activityCalendar: overview.activityCalendar,
    recentActivity: overview.recentActivity,
    mirror: overview.mirror,
    ratingSystem: settings.ratingSystem,
  };
});
