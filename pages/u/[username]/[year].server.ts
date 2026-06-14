import { defineHandler } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { findProfileByUsername } from "@/domain/user";
import {
  getWrappedSummary,
  isYearRecapPublic,
  wrappedYearsForUser,
  zonedYearMonth,
} from "@/domain/insights/wrapped";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const username = c.req.param("username");
  if (!username) return c.notFound();

  const profile = await findProfileByUsername(username);
  if (!profile) return c.notFound();

  const viewer = getUser();
  const owner = viewer?.id === profile.id;
  if (profile.visibility !== "public" && !owner) return c.notFound();

  const year = Number(c.req.param("year"));
  if (!Number.isInteger(year) || year < 2000) return c.notFound();

  const today = new Date();
  const { year: currentYear } = zonedYearMonth(today, profile.timeZone);
  if (year > currentYear) return c.notFound(); // no recap for a future year

  const activityYears = await wrappedYearsForUser(profile.id);

  // The owner can preview their in-progress current year. Visitors see it locked
  // until December. Completed years with no activity have no recap.
  const locked =
    !owner && year === currentYear && !isYearRecapPublic(year, today, profile.timeZone);
  if (!locked && !activityYears.includes(year) && !(owner && year === currentYear)) {
    return c.notFound();
  }

  const wrapped = locked ? null : await getWrappedSummary(profile.id, { year });

  const lockedYear =
    owner || isYearRecapPublic(currentYear, today, profile.timeZone) ? null : currentYear;
  const years =
    !owner && lockedYear && !activityYears.includes(lockedYear)
      ? [lockedYear, ...activityYears]
      : activityYears;

  return { profile, owner, year, locked, wrapped, years, lockedYear };
});
