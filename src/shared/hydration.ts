// Hydration freshness is a derived state, not a stored enum. The pure type lives
// here so client bundles and DTOs can name it without importing server code; the
// derivation logic stays in @/domain/hydration.
export type HydrationState = "stub" | "fresh" | "stale" | "failed";
