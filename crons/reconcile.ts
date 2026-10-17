import { defineScheduled } from "void";
import { logger } from "void/log";
import { reconcileMediaDetails } from "@/services/media-hydration";

export const cron = "*/15 * * * *";

export default defineScheduled(async () => {
  const count = await reconcileMediaDetails();
  if (count > 0) logger.info("reconcile: enqueued media-details refresh", { count });
});
