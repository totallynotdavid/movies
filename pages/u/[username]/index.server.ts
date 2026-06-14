import { defineHandler } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { findProfileByUsername, getUserSettings } from "@/domain/user";
import {
  getProfileOverview,
  getPublicProfileOverview,
  type PublicProfileOverview,
} from "@/domain/insights/profile";
import type { Mirror } from "@/domain/insights/mirror";
import { favoriteMediaForUser, favoritePeopleForUser } from "@/domain/tracking/favorites";
import { isYearRecapPublic, wrappedYearsForUser, zonedYearMonth } from "@/domain/insights/wrapped";
import type { RatingSystem } from "@/domain/rating";

export type Props = InferProps<typeof loader>;

// Private profiles are hard 404s for everyone except the owner.
// Owners get private analysis and personal ratings; visitors get the public projection.
export const loader = defineHandler(async (c) => {
  const username = c.req.param("username");
  if (!username) return c.notFound();

  const profile = await findProfileByUsername(username);
  if (!profile) return c.notFound();

  const viewer = getUser();
  const owner = viewer?.id === profile.id;
  if (profile.visibility !== "public" && !owner) return c.notFound();

  const [favoriteMedia, favoritePeople, activityYears, settings] = await Promise.all([
    favoriteMediaForUser(profile.id),
    favoritePeopleForUser(profile.id),
    wrappedYearsForUser(profile.id),
    owner ? getUserSettings(profile.id) : Promise.resolve(null),
  ]);

  let overview: PublicProfileOverview;
  let mirror: Mirror | null = null;
  if (owner) {
    const full = await getProfileOverview(profile.id);
    overview = full;
    mirror = full.mirror;
  } else {
    overview = await getPublicProfileOverview(profile.id);
  }

  // The owner can always open the in-progress current year; a visitor sees it as a
  // locked chip until its December unlock.
  const today = new Date();
  const { year: currentYear } = zonedYearMonth(today, profile.timeZone);
  const lockedYear =
    owner || isYearRecapPublic(currentYear, today, profile.timeZone) ? null : currentYear;
  const years =
    !owner && lockedYear && !activityYears.includes(lockedYear)
      ? [lockedYear, ...activityYears]
      : activityYears;

  return {
    profile,
    owner,
    isPrivate: profile.visibility !== "public",
    ratingSystem: (settings?.ratingSystem ?? "score100") as RatingSystem,
    mirror,
    favoriteMedia,
    favoritePeople,
    formatStats: overview.formatStats,
    activityCalendar: overview.activityCalendar,
    recentActivity: overview.recentActivity,
    years,
    lockedYear,
  };
});
