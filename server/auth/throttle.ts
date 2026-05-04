import type { SqlDatabase } from "../db/client";

export async function recordFailedLogin(db: SqlDatabase, key: string): Promise<void> {
  await db
    .insertInto("auth_throttle_counters")
    .values({ key, attempts: 1, locked_until: null, updated_at: new Date().toISOString() })
    .onConflict((oc) =>
      oc.column("key").doUpdateSet((eb) => ({
        attempts: eb("auth_throttle_counters.attempts", "+", 1),
        updated_at: new Date().toISOString(),
      })),
    )
    .execute();
}

export async function resetLoginThrottle(db: SqlDatabase, key: string): Promise<void> {
  await db.deleteFrom("auth_throttle_counters").where("key", "=", key).execute();
}
