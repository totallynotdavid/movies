import { defineHandler } from "void";
import type { InferProps } from "void";
import { findPublicProfile } from "@/domain/user";
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

  const profile = await findPublicProfile(username);
  if (!profile) return c.notFound();

  const year = Number(c.req.param("year"));
  if (!Number.isInteger(year) || year < 2000) return c.notFound();

  const today = new Date();
  const { year: currentYear } = zonedYearMonth(today, profile.timeZone);
  if (year > currentYear) return c.notFound(); // no recap for a future year

  const activityYears = await wrappedYearsForUser(profile.id);

  // The current year is locked (soft-locked, not 404) until its December unlock;
  // a completed year with no activity simply has no recap.
  const locked = year === currentYear && !isYearRecapPublic(year, today, profile.timeZone);
  if (!locked && !activityYears.includes(year)) return c.notFound();

  const wrapped = locked ? null : await getWrappedSummary(profile.id, { year });

  const lockedYear = isYearRecapPublic(currentYear, today, profile.timeZone) ? null : currentYear;
  const years =
    lockedYear && !activityYears.includes(lockedYear)
      ? [lockedYear, ...activityYears]
      : activityYears;

  return { profile, year, locked, wrapped, years, lockedYear };
});
