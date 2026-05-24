import { db } from "void/db";
import { desc, eq } from "drizzle-orm";
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

export async function upsertLibraryEntry(input: {
  userId: string;
  mediaId: string;
  status: LibraryStatus;
  score100?: number | null;
  progressCurrent?: number;
  progressTotal?: number | null;
  notes?: string | null;
}) {
  const now = Date.now();
  const id = `${input.userId}:${input.mediaId}`;

  await db
    .insert(libraryEntries)
    .values({
      id,
      userId: input.userId,
      mediaId: input.mediaId,
      status: input.status,
      score100: input.score100 ?? null,
      progressCurrent: input.progressCurrent ?? 0,
      progressTotal: input.progressTotal ?? null,
      notes: input.notes ?? null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [libraryEntries.userId, libraryEntries.mediaId],
      set: {
        status: input.status,
        score100: input.score100 ?? null,
        progressCurrent: input.progressCurrent ?? 0,
        progressTotal: input.progressTotal ?? null,
        notes: input.notes ?? null,
        updatedAt: now,
      },
    });

  return { ok: true };
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
