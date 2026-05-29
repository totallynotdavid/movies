import { db } from "void/db";
import { and, desc, eq } from "drizzle-orm";
import { libraryEntries, media, users } from "../../db/schema";

export type LibraryStatus = "planned" | "watching" | "completed" | "paused" | "dropped";
export type UserRole = "anonymous" | "member" | "admin";
const libraryStatuses = ["planned", "watching", "completed", "paused", "dropped"] as const;

export async function listLibraryForUser(userId: string) {
  return db
    .select({
      id: libraryEntries.id,
      status: libraryEntries.status,
      score100: libraryEntries.score100,
      progressCurrent: libraryEntries.progressCurrent,
      progressTotal: libraryEntries.progressTotal,
      notes: libraryEntries.notes,
      updatedAt: libraryEntries.updatedAt,
      media,
    })
    .from(libraryEntries)
    .innerJoin(media, eq(libraryEntries.mediaId, media.id))
    .where(eq(libraryEntries.userId, userId))
    .orderBy(desc(libraryEntries.updatedAt));
}

export async function getLibraryEntryForUser(userId: string, mediaId: string) {
  const rows = await db
    .select()
    .from(libraryEntries)
    .where(and(eq(libraryEntries.userId, userId), eq(libraryEntries.mediaId, mediaId)))
    .limit(1);
  return rows[0] ?? null;
}

export function parseLibraryStatus(value: unknown): LibraryStatus | null {
  if (typeof value !== "string") return null;
  return libraryStatuses.find((status) => status === value) ?? null;
}

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

export type RatingSystem = "score5" | "score10" | "score100";
const ratingSystems: RatingSystem[] = ["score5", "score10", "score100"];

export function parseRatingSystem(value: unknown): RatingSystem {
  if (typeof value === "string" && ratingSystems.includes(value as RatingSystem)) {
    return value as RatingSystem;
  }
  return "score100";
}

export function displayScore(score100: number, system: RatingSystem): number {
  if (system === "score5") return Math.round(score100 / 20);
  if (system === "score10") return Math.round(score100 / 10);
  return score100;
}

export function toScore100(value: number, system: RatingSystem): number {
  if (system === "score5") return Math.min(100, Math.max(0, value * 20));
  if (system === "score10") return Math.min(100, Math.max(0, value * 10));
  return Math.min(100, Math.max(0, value));
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
