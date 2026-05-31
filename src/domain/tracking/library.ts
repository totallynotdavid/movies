import { db } from "void/db";
import { and, desc, eq } from "drizzle-orm";
import { libraryEntries, media } from "../../../db/schema";
import { attempt, ok, type Result } from "../../result";
import type { MediaRecord } from "../catalog/media";
import type { TrackingError } from "../errors";
import { listShowProgress } from "./watch-state";

export type LibraryStatus = "planned" | "watching" | "completed" | "paused" | "dropped";
const libraryStatuses = ["planned", "watching", "completed", "paused", "dropped"] as const;

export type LibraryEntryRecord = typeof libraryEntries.$inferSelect;

// Library entry joined with media and derived progress.
// Shared per-user intent read shape for library/profile views.
export type LibraryEntryWithProgress = LibraryEntryRecord & {
  media: MediaRecord;
  watchedEpisodeCount: number;
  airedEpisodeCount: number | null;
};

export function parseLibraryStatus(value: unknown): LibraryStatus | null {
  if (typeof value !== "string") return null;
  return libraryStatuses.find((status) => status === value) ?? null;
}

// Per-user intent read. Progress is derived once per show.
export async function entriesWithProgress(userId: string): Promise<LibraryEntryWithProgress[]> {
  const rows = await db
    .select({ entry: libraryEntries, media })
    .from(libraryEntries)
    .innerJoin(media, eq(libraryEntries.mediaId, media.id))
    .where(eq(libraryEntries.userId, userId))
    .orderBy(desc(libraryEntries.updatedAt));

  const showIds = rows.filter((r) => r.media.mediaType === "show").map((r) => r.media.id);
  const progress = await listShowProgress(userId, showIds);

  return rows.map(({ entry, media }) => ({
    ...entry,
    media,
    watchedEpisodeCount: progress.get(media.id)?.watchedEpisodeCount ?? 0,
    airedEpisodeCount: progress.get(media.id)?.airedEpisodeCount ?? null,
  }));
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
 * Episode progress is derived from watch_events, not stored here.
 * lastWatchedAt is a watch-log owned cache and stays untouched.
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
