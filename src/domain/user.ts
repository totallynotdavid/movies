import { db } from "void/db";
import { and, eq, isNull } from "drizzle-orm";
import { users } from "../../db/schema";
import { parseRatingSystem, type RatingSystem } from "./rating";

export type UserRole = "anonymous" | "member" | "admin";

export async function ensureProfileForAuthUser(input: { id: string; email: string; name: string }) {
  const now = Date.now();
  await db
    .insert(users)
    .values({
      id: input.id,
      email: input.email,
      name: input.name || input.email,
      role: "member",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
}

export async function getUserRole(userId: string) {
  const rows = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const role = rows[0]?.role;
  return role === "admin" ? "admin" : "member";
}

export async function getUserSettings(userId: string) {
  const rows = await db
    .select({ ratingSystem: users.ratingSystem, timeZone: users.timeZone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return {
    ratingSystem: parseRatingSystem(rows[0]?.ratingSystem),
    timeZone: rows[0]?.timeZone ?? null,
  };
}

// First-run auto-capture: only fills the zone when unset, so it never clobbers a
// choice the user made in settings (or on another device). Idempotent.
export async function captureTimeZone(userId: string, timeZone: string): Promise<void> {
  await db
    .update(users)
    .set({ timeZone })
    .where(and(eq(users.id, userId), isNull(users.timeZone)));
}

export async function getUserTimeZone(userId: string): Promise<string | null> {
  const rows = await db
    .select({ timeZone: users.timeZone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0]?.timeZone ?? null;
}

export async function updateUserSettings(
  userId: string,
  input: { ratingSystem?: RatingSystem; timeZone?: string | null },
) {
  const set: { ratingSystem?: RatingSystem; timeZone?: string | null } = {};
  if (input.ratingSystem !== undefined) set.ratingSystem = input.ratingSystem;
  if (input.timeZone !== undefined) set.timeZone = input.timeZone;
  if (Object.keys(set).length > 0) {
    await db.update(users).set(set).where(eq(users.id, userId));
  }
  return getUserSettings(userId);
}
