import { defineScheduled } from "void";
import { logger } from "void/log";
import { reconcileMediaDetails } from "@/services/media-hydration";

// Refreshing stale/failed/un-hydrated media is owned here, not by the page
// loader: a fixed-cadence bounded sweep instead of a per-view enqueue. This also
// warms the seeded catalog (most-popular first) so cold-stub blocks stay rare,
// and is what guarantees a watched title eventually hydrates even if its detail
// page was never opened. Local dev does not auto-fire; POST /__void/scheduled.
export const cron = "*/15 * * * *";

export default defineScheduled(async () => {
  const count = await reconcileMediaDetails();
  if (count > 0) logger.info("reconcile: enqueued media-details refresh", { count });
});
