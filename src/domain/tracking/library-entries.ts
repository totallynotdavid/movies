import { db } from "void/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { libraryEntries, media, watchEvents } from "@schema";
import { attempt, ok, type Result } from "@/result";
import { selectByIds, type Statement } from "@/db/kernel";
import type { MediaRecord } from "@/domain/catalog/media";
import type { TrackingError } from "@/domain/errors";
import { listShowProgress } from "./progress";
import { resolveStatus, type LibraryStatus } from "@/shared/library-status";

export type LibraryEntryRecord = typeof libraryEntries.$inferSelect;

export type LibraryEntryWithProgress = LibraryEntryRecord & {
  media: MediaRecord;
  status: LibraryStatus;
  watchedEpisodeCount: number;
  airedEpisodeCount: number | null;
  lastWatchedAt: number | null;
};

// An omitted field keeps the previous value.
export type EntryPatch = {
  filedStatus?: LibraryStatus;
  score100?: number | null;
  notes?: string | null;
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
    filedStatus: patch.filedStatus ?? prev?.filedStatus ?? "planned",
    score100: patch.score100 !== undefined ? patch.score100 : (prev?.score100 ?? null),
    notes: patch.notes !== undefined ? patch.notes : (prev?.notes ?? null),
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
        filedStatus: row.filedStatus,
        score100: row.score100,
        notes: row.notes,
        updatedAt: row.updatedAt,
      },
    });
}

// Registers a title without overwriting an existing filed status or score.
export function ensureEntryWrite(row: LibraryEntryRecord): Statement {
  return db
    .insert(libraryEntries)
    .values(row)
    .onConflictDoNothing({
      target: [libraryEntries.userId, libraryEntries.mediaId],
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

type WatchSummary = { lastWatchedAt: number };

async function watchSummaries(
  userId: string,
  mediaIds: readonly string[],
): Promise<Map<string, WatchSummary>> {
  const rows = await selectByIds(mediaIds, (batch) =>
    db
      .select({
        mediaId: watchEvents.mediaId,
        lastWatchedAt: sql<number>`max(${watchEvents.watchedAt})`,
      })
      .from(watchEvents)
      .where(and(eq(watchEvents.userId, userId), inArray(watchEvents.mediaId, batch)))
      .groupBy(watchEvents.mediaId),
  );
  return new Map(rows.map((row) => [row.mediaId, { lastWatchedAt: row.lastWatchedAt }]));
}

export async function entriesWithProgress(userId: string): Promise<LibraryEntryWithProgress[]> {
  const rows = await db
    .select({ entry: libraryEntries, media })
    .from(libraryEntries)
    .innerJoin(media, eq(libraryEntries.mediaId, media.id))
    .where(eq(libraryEntries.userId, userId))
    .orderBy(desc(libraryEntries.updatedAt));

  const showIds = rows.filter((r) => r.media.mediaType === "show").map((r) => r.media.id);
  const [progress, summaries] = await Promise.all([
    listShowProgress(userId, showIds),
    watchSummaries(
      userId,
      rows.map((r) => r.media.id),
    ),
  ]);

  return rows.map(({ entry, media }) => {
    const summary = summaries.get(media.id) ?? null;
    const show = progress.get(media.id);

    const watchedEpisodeCount =
      media.mediaType === "movie" ? (summary ? 1 : 0) : (show?.watchedEpisodeCount ?? 0);
    const complete =
      media.mediaType === "movie" ? summary !== null : (show?.allAiredWatched ?? false);

    return {
      ...entry,
      media,
      status: resolveStatus(entry.filedStatus, { complete, watchedCount: watchedEpisodeCount }),
      watchedEpisodeCount,
      airedEpisodeCount: show?.airedEpisodeCount ?? null,
      lastWatchedAt: summary?.lastWatchedAt ?? null,
    };
  });
}
