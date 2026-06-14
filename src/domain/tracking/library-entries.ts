import { db } from "void/db";
import { and, desc, eq } from "drizzle-orm";
import { libraryEntries, media } from "@schema";
import { attempt, ok, type Result } from "@/result";
import type { Statement } from "@/db/kernel";
import type { MediaRecord } from "@/domain/catalog/media";
import type { TrackingError } from "@/domain/errors";
import { listShowProgress } from "./progress";
import type { LibraryStatus } from "@/shared/library-status";

export type LibraryEntryRecord = typeof libraryEntries.$inferSelect;

export type LibraryEntryWithProgress = LibraryEntryRecord & {
  media: MediaRecord;
  watchedEpisodeCount: number;
  airedEpisodeCount: number | null;
};

// What a command wants to change. An omitted field keeps the previous value;
// lastWatchedAt is set only by watch commands and never decreases.
export type EntryPatch = {
  status?: LibraryStatus;
  score100?: number | null;
  notes?: string | null;
  lastWatchedAt?: number;
};

export function buildEntry(
  userId: string,
  mediaId: string,
  prev: LibraryEntryRecord | null,
  patch: EntryPatch,
): LibraryEntryRecord {
  const now = Date.now();
  return {
    id: prev?.id ?? crypto.randomUUID(),
    userId,
    mediaId,
    status: patch.status ?? prev?.status ?? "planned",
    score100: patch.score100 !== undefined ? patch.score100 : (prev?.score100 ?? null),
    notes: patch.notes !== undefined ? patch.notes : (prev?.notes ?? null),
    // Keeps the most recent watch instant, including back-dated logs.
    lastWatchedAt:
      patch.lastWatchedAt !== undefined
        ? Math.max(prev?.lastWatchedAt ?? 0, patch.lastWatchedAt)
        : (prev?.lastWatchedAt ?? null),
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  };
}

export function entryUpsertWrite(row: LibraryEntryRecord): Statement {
  return db
    .insert(libraryEntries)
    .values(row)
    .onConflictDoUpdate({
      target: [libraryEntries.userId, libraryEntries.mediaId],
      set: {
        status: row.status,
        score100: row.score100,
        notes: row.notes,
        lastWatchedAt: row.lastWatchedAt,
        updatedAt: row.updatedAt,
      },
    });
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

export async function upsertEntry(
  row: LibraryEntryRecord,
): Promise<Result<LibraryEntryRecord, TrackingError>> {
  const result = await attempt(
    db.batch([entryUpsertWrite(row)]),
    (cause): TrackingError => ({ kind: "persistence_failed", cause }),
  );
  if (!result.ok) return result;
  return ok(row);
}

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
