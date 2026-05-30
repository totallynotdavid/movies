import { defineHandler } from "void";
import type { InferProps } from "void";
import { requireAuth } from "void/auth";
import { getUserSettings } from "../src/domain/user";
import { getWrappedSummary } from "../src/domain/wrapped";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const user = requireAuth(c);
  const [wrapped, settings] = await Promise.all([
    getWrappedSummary(user.id),
    getUserSettings(user.id),
  ]);

  return {
    user,
    wrapped,
    ratingSystem: settings.ratingSystem,
  };
});
