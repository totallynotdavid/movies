import {
  getWrappedSummary,
  type WrappedSummary,
  wrappedYearsForUser,
} from "@/domain/insights/wrapped";
import { buildRecapYears, type RecapYear } from "@/domain/recaps";
import type { ProfileIdentity } from "@/domain/user";
import { findViewableProfile } from "./viewable-profile";

export type ProfileRecapPageModel =
  | { kind: "not_found" }
  | {
      kind: "recap";
      viewer: { owner: boolean };
      profile: ProfileIdentity;
      year: number;
      recapAccess: RecapYear["access"];
      recapYears: RecapYear[];
      wrapped: WrappedSummary | null;
    };

export async function profileRecapPage(input: {
  username: string | undefined;
  year: string | undefined;
  viewerId: string | null;
  today?: Date;
}): Promise<ProfileRecapPageModel> {
  const visible = await findViewableProfile(input.username, input.viewerId);
  if (!visible) return { kind: "not_found" };

  const year = parseRecapYear(input.year);
  if (year === null) return { kind: "not_found" };

  const { profile, owner } = visible;
  const today = input.today ?? new Date();
  const activityYears = await wrappedYearsForUser(visible.profile.id);
  const recapYears = buildRecapYears({ activityYears, profile, owner, today });
  const recap = recapYears.find((item) => item.year === year);
  if (!recap) return { kind: "not_found" };

  return {
    kind: "recap",
    viewer: { owner },
    profile,
    year,
    recapAccess: recap.access,
    recapYears,
    wrapped: recap.access === "locked" ? null : await getWrappedSummary(profile.id, { year }),
  };
}

function parseRecapYear(value: string | undefined): number | null {
  const year = Number(value);
  if (!Number.isInteger(year)) return null;
  return year >= 2000 ? year : null;
}
