import { defineQueue } from "void";
import { logger } from "void/log";
import { runHydrationMessage } from "@/services/media-hydration";
import type { HydrationMessage } from "@/shared/types/metadata";

const RETRY_EXHAUSTION_ATTEMPTS = 5;

export const maxRetries = RETRY_EXHAUSTION_ATTEMPTS;

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

    if (msg.attempts >= RETRY_EXHAUSTION_ATTEMPTS) {
      logger.error("hydration job exhausted retries", { body: msg.body, error: outcome.error });
      msg.ack();
    } else {
      msg.retry({ delaySeconds: 30 });
    }
  }
});
