import { eq, sql } from "drizzle-orm";
import { db } from "void/db";
import { authThrottleCounters } from "../db/schema";

export async function recordFailedLogin(key: string): Promise<void> {
  await db
    .insert(authThrottleCounters)
    .values({ key, attempts: 1, lockedUntil: null, updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: authThrottleCounters.key,
      set: {
        attempts: sql`${authThrottleCounters.attempts} + 1`,
        updatedAt: new Date().toISOString(),
      },
    });
}

export async function resetLoginThrottle(key: string): Promise<void> {
  await db.delete(authThrottleCounters).where(eq(authThrottleCounters.key, key));
}
