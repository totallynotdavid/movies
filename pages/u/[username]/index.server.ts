import { defineHandler } from "void";
import type { InferProps } from "void";
import { findPublicProfile } from "@/domain/user";
import { getPublicProfileOverview } from "@/domain/insights/profile";
import { favoriteMediaForUser, favoritePeopleForUser } from "@/domain/tracking/favorites";
import { isYearRecapPublic, wrappedYearsForUser, zonedYearMonth } from "@/domain/insights/wrapped";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const username = c.req.param("username");
  if (!username) return c.notFound();

  const profile = await findPublicProfile(username);
  if (!profile) return c.notFound();

  const [overview, favoriteMedia, favoritePeople, activityYears] = await Promise.all([
    getPublicProfileOverview(profile.id),
    favoriteMediaForUser(profile.id),
    favoritePeopleForUser(profile.id),
    wrappedYearsForUser(profile.id),
  ]);

  // The current year's recap stays locked until December; surface it as a locked
  // chip on the year nav even when it has no activity yet.
  const today = new Date();
  const { year: currentYear } = zonedYearMonth(today, profile.timeZone);
  const lockedYear = isYearRecapPublic(currentYear, today, profile.timeZone) ? null : currentYear;
  const years =
    lockedYear && !activityYears.includes(lockedYear)
      ? [lockedYear, ...activityYears]
      : activityYears;

  return {
    profile,
    favoriteMedia,
    favoritePeople,
    formatStats: overview.formatStats,
    activityCalendar: overview.activityCalendar,
    recentActivity: overview.recentActivity,
    years,
    lockedYear,
  };
});
