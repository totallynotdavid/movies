import { defineQueue } from "void";
import { logger } from "void/log";
import { runHydrationMessage } from "@/services/media-hydration";
import type { HydrationMessage } from "@/shared/types/metadata";

// Void requires this setting to be a numeric literal at build time.
export const maxRetries = 5;

export default defineQueue<HydrationMessage>(async (batch) => {
  for (const msg of batch.messages) {
    const outcome = await runHydrationMessage(msg.body);
    if (outcome.ok) {
      msg.ack();
      continue;
    }

    logger.warn("hydration job failed", {
      body: msg.body,
      attempt: msg.attempts,
      error: outcome.error,
    });

    if (msg.attempts >= maxRetries) {
      logger.error("hydration job exhausted retries", { body: msg.body, error: outcome.error });
      msg.ack();
    } else {
      msg.retry({ delaySeconds: 30 });
    }
  }
});
