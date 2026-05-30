import { db } from "void/db";
import { and, desc, eq } from "drizzle-orm";
import { libraryEntries, media } from "../../db/schema";
import { attempt, ok, type Result } from "../result";
import type { TrackingError } from "./errors";

export type LibraryStatus = "planned" | "watching" | "completed" | "paused" | "dropped";
const libraryStatuses = ["planned", "watching", "completed", "paused", "dropped"] as const;

export type LibraryEntryRecord = typeof libraryEntries.$inferSelect;

export function parseLibraryStatus(value: unknown): LibraryStatus | null {
  if (typeof value !== "string") return null;
  return libraryStatuses.find((status) => status === value) ?? null;
}

export async function listLibraryForUser(userId: string) {
  return db
    .select({
      id: libraryEntries.id,
      status: libraryEntries.status,
      score100: libraryEntries.score100,
      notes: libraryEntries.notes,
      episodesWatched: libraryEntries.episodesWatched,
      lastWatchedAt: libraryEntries.lastWatchedAt,
      updatedAt: libraryEntries.updatedAt,
      media,
    })
    .from(libraryEntries)
    .innerJoin(media, eq(libraryEntries.mediaId, media.id))
    .where(eq(libraryEntries.userId, userId))
    .orderBy(desc(libraryEntries.updatedAt));
}

export async function findEntry(
  userId: string,
  mediaId: string,
): Promise<Result<LibraryEntryRecord | null, TrackingError>> {
  const rows = await attempt(
    db
      .select()
      .from(libraryEntries)
      .where(and(eq(libraryEntries.userId, userId), eq(libraryEntries.mediaId, mediaId)))
      .limit(1),
    (cause): TrackingError => ({ kind: "persistence_failed", cause }),
  );
  if (!rows.ok) return rows;
  return ok(rows.value[0] ?? null);
}

type LibraryEntryInput = {
  userId: string;
  mediaId: string;
  status: LibraryStatus;
  score100?: number | null;
  notes?: string | null;
};

/**
 * Create or update the user-editable fields of a library entry (status, score, notes).
 * The progress cache (episodesWatched/lastWatchedAt) is owned by watch logging and left untouched.
 */
export async function upsertLibraryEntry(
  input: LibraryEntryInput,
): Promise<Result<LibraryEntryRecord, TrackingError>> {
  const existing = await findEntry(input.userId, input.mediaId);
  if (!existing.ok) return existing;

  const now = Date.now();
  const prev = existing.value;
  const row: LibraryEntryRecord = {
    id: prev?.id ?? crypto.randomUUID(),
    userId: input.userId,
    mediaId: input.mediaId,
    status: input.status,
    score100: input.score100 !== undefined ? input.score100 : (prev?.score100 ?? null),
    notes: input.notes !== undefined ? input.notes : (prev?.notes ?? null),
    episodesWatched: prev?.episodesWatched ?? 0,
    lastWatchedAt: prev?.lastWatchedAt ?? null,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  };

  const result = await attempt(
    db
      .insert(libraryEntries)
      .values(row)
      .onConflictDoUpdate({
        target: [libraryEntries.userId, libraryEntries.mediaId],
        set: {
          status: row.status,
          score100: row.score100,
          notes: row.notes,
          updatedAt: row.updatedAt,
        },
      }),
    (cause): TrackingError => ({ kind: "persistence_failed", cause }),
  );
  if (!result.ok) return result;
  return ok(row);
}
