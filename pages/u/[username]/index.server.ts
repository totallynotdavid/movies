import { defineHandler } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { findProfileByUsername, getUserSettings } from "@/domain/user";
import { getProfileCard } from "@/services/profile-page";
import { getOwnerInsights } from "@/domain/insights/mirror";
import { isYearRecapPublic, wrappedYearsForUser, zonedYearMonth } from "@/domain/insights/wrapped";
import type { RatingSystem } from "@/domain/rating";

export type Props = InferProps<typeof loader>;

// Private profiles are hard 404s for everyone except the owner.
// Owners get the private insights dashboard; visitors get only the public card.
export const loader = defineHandler(async (c) => {
  const username = c.req.param("username");
  if (!username) return c.notFound();

  const profile = await findProfileByUsername(username);
  if (!profile) return c.notFound();

  const viewer = getUser();
  const owner = viewer?.id === profile.id;
  if (profile.visibility !== "public" && !owner) return c.notFound();

  const [activityYears, settings] = await Promise.all([
    wrappedYearsForUser(profile.id),
    owner ? getUserSettings(profile.id) : Promise.resolve(null),
  ]);
  const ratingSystem = (settings?.ratingSystem ?? "score100") as RatingSystem;

  // The owner is the only viewer whose insights we build; for everyone else it is
  // null by construction, so nothing downstream re-checks visibility.
  const [card, insights] = await Promise.all([
    getProfileCard(profile, ratingSystem),
    owner ? getOwnerInsights(profile.id) : Promise.resolve(null),
  ]);

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
    owner,
    isPrivate: profile.visibility !== "public",
    card,
    insights,
    recap: { years, lockedYear },
  };
});
