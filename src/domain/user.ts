import { db } from "void/db";
import { eq } from "drizzle-orm";
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
    .select({ ratingSystem: users.ratingSystem })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return { ratingSystem: parseRatingSystem(rows[0]?.ratingSystem) };
}

export async function updateUserSettings(userId: string, input: { ratingSystem: RatingSystem }) {
  await db.update(users).set({ ratingSystem: input.ratingSystem }).where(eq(users.id, userId));
  return { ratingSystem: input.ratingSystem };
}
