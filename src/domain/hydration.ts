// Hydration freshness is derived, not a stored enum: each track keeps a
// `*HydratedAt` timestamp (last success) and a `*Error` string (last failure),
// and the state falls out of the two. A successful hydration clears the error,
// so a set error always means the most recent attempt failed.

export type HydrationState = "stub" | "fresh" | "stale" | "failed";

export const DETAILS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const EPISODES_TTL_MS = DETAILS_TTL_MS;

export function hydrationState(
  hydratedAt: number | null,
  error: string | null,
  ttlMs: number,
): HydrationState {
  // Never successfully hydrated: distinguish a fresh stub from a failed attempt
  // so the trigger can block (nothing to show) vs. render-empty-and-retry.
  if (hydratedAt === null) return error ? "failed" : "stub";
  // We have data; the error (if any) just means the last refresh failed.
  return Date.now() - hydratedAt < ttlMs ? "fresh" : "stale";
}

export function summarizeCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
