// A successful hydration clears the error, so a set error always means the most
// recent attempt failed.

import type { HydrationState } from "@/shared/hydration";

export const DETAILS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const EPISODES_TTL_MS = DETAILS_TTL_MS;

export function hydrationState(
  hydratedAt: number | null,
  error: string | null,
  ttlMs: number,
): HydrationState {
  if (hydratedAt === null) return error ? "failed" : "stub";
  // Stored data outlives a failed refresh; only the TTL decides stale.
  return Date.now() - hydratedAt < ttlMs ? "fresh" : "stale";
}

export function summarizeCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
