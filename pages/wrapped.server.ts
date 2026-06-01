import { defineHandler } from "void";
import type { InferProps } from "void";
import { requireAuth } from "void/auth";
import { getUserSettings } from "@/domain/user";
import { getWrappedSummary } from "@/domain/insights/wrapped";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const user = requireAuth(c);
  // Settings first: the default recap year is resolved in the user's zone.
  const settings = await getUserSettings(user.id);
  const wrapped = await getWrappedSummary(user.id, { timeZone: settings.timeZone });

  return {
    user,
    wrapped,
    ratingSystem: settings.ratingSystem,
  };
});
