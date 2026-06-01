import { defineHandler } from "void";
import type { InferProps } from "void";
import { requireAuth } from "void/auth";
import { getProfileOverview } from "@/domain/insights/profile";
import { favoriteMediaForUser, favoritePeopleForUser } from "@/domain/tracking/favorites";
import { getUserProfile } from "@/domain/user";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const user = requireAuth(c);

  // Compose the private profile payload from identity, overview projections, and favorites.
  const [profile, overview, favoriteMedia, favoritePeople] = await Promise.all([
    getUserProfile(user.id),
    getProfileOverview(user.id),
    favoriteMediaForUser(user.id),
    favoritePeopleForUser(user.id),
  ]);
  if (!profile) return c.notFound();

  return {
    profile,
    favoriteMedia,
    favoritePeople,
    formatStats: overview.formatStats,
    activityCalendar: overview.activityCalendar,
    recentActivity: overview.recentActivity,
    mirror: overview.mirror,
  };
});
