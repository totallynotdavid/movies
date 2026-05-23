import { and, desc, eq } from "drizzle-orm";
import { db } from "void/db";
import type { LibraryEntry, TrackingStatus } from "#shared/types/tracking";
import { entities, libraryEntries, watchEvents } from "../db/schema";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function mapEntry(
  row: typeof libraryEntries.$inferSelect & { mediaType: "movie" | "show"; title: string },
): LibraryEntry {
  return {
    id: row.id,
    userId: row.userId,
    entityId: row.entityId,
    mediaType: row.mediaType,
    title: row.title,
    status: row.status,
    score100: row.score100,
    progressCurrent: row.progressCurrent,
    progressTotal: row.progressTotal,
    startedOn: row.startedOn,
    finishedOn: row.finishedOn,
    rewatchCount: row.rewatchCount,
    notes: row.notes,
    updatedAt: row.updatedAt,
  };
}

export async function listLibraryEntries(userId: string): Promise<LibraryEntry[]> {
  const rows = await db
    .select({
      id: libraryEntries.id,
      userId: libraryEntries.userId,
      entityId: libraryEntries.entityId,
      status: libraryEntries.status,
      score100: libraryEntries.score100,
      progressCurrent: libraryEntries.progressCurrent,
      progressTotal: libraryEntries.progressTotal,
      startedOn: libraryEntries.startedOn,
      finishedOn: libraryEntries.finishedOn,
      rewatchCount: libraryEntries.rewatchCount,
      notes: libraryEntries.notes,
      updatedAt: libraryEntries.updatedAt,
      mediaType: entities.type,
      title: entities.title,
    })
    .from(libraryEntries)
    .innerJoin(entities, eq(entities.id, libraryEntries.entityId))
    .where(eq(libraryEntries.userId, userId))
    .orderBy(desc(libraryEntries.updatedAt));

  return rows.map(mapEntry);
}

export async function upsertMovieWatched(input: {
  userId: string;
  entityId: string;
  score100?: number | null;
  watchedOn?: string;
}): Promise<LibraryEntry> {
  const now = new Date().toISOString();
  const watchedOn = input.watchedOn || todayIsoDate();

  const [existing] = await db
    .select({
      rewatchCount: libraryEntries.rewatchCount,
      score100: libraryEntries.score100,
      startedOn: libraryEntries.startedOn,
    })
    .from(libraryEntries)
    .where(
      and(eq(libraryEntries.userId, input.userId), eq(libraryEntries.entityId, input.entityId)),
    )
    .limit(1);

  await db
    .insert(libraryEntries)
    .values({
      id: crypto.randomUUID(),
      userId: input.userId,
      entityId: input.entityId,
      status: "completed",
      score100: input.score100 ?? existing?.score100 ?? null,
      progressCurrent: 1,
      progressTotal: 1,
      startedOn: existing?.startedOn || watchedOn,
      finishedOn: watchedOn,
      rewatchCount: existing ? existing.rewatchCount + 1 : 0,
      notes: null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [libraryEntries.userId, libraryEntries.entityId],
      set: {
        status: "completed",
        score100: input.score100 ?? existing?.score100 ?? null,
        progressCurrent: 1,
        progressTotal: 1,
        finishedOn: watchedOn,
        rewatchCount: existing ? existing.rewatchCount + 1 : 0,
        updatedAt: now,
      },
    });

  await db.insert(watchEvents).values({
    id: crypto.randomUUID(),
    userId: input.userId,
    entityId: input.entityId,
    episodeId: null,
    eventType: "movie_completed",
    watchedOn,
    createdAt: now,
  });

  const entries = await listLibraryEntries(input.userId);
  return entries.find((e) => e.entityId === input.entityId)!;
}

export async function advanceShow(input: {
  userId: string;
  entityId: string;
  expectedNextEpisode?: number;
  totalEpisodes?: number | null;
}): Promise<{ entry: LibraryEntry; conflict: boolean }> {
  const now = new Date().toISOString();

  const [existing] = await db
    .select()
    .from(libraryEntries)
    .where(
      and(eq(libraryEntries.userId, input.userId), eq(libraryEntries.entityId, input.entityId)),
    )
    .limit(1);

  const current = existing?.progressCurrent || 0;
  const next = current + 1;
  const conflict =
    typeof input.expectedNextEpisode === "number" && input.expectedNextEpisode !== next;

  if (conflict && existing) {
    const entries = await listLibraryEntries(input.userId);
    return { entry: entries.find((e) => e.entityId === input.entityId)!, conflict: true };
  }

  const total = input.totalEpisodes ?? existing?.progressTotal ?? null;
  const completed = typeof total === "number" ? next >= total : false;
  const status: TrackingStatus = completed ? "completed" : "watching";

  await db
    .insert(libraryEntries)
    .values({
      id: crypto.randomUUID(),
      userId: input.userId,
      entityId: input.entityId,
      status,
      score100: existing?.score100 ?? null,
      progressCurrent: next,
      progressTotal: total,
      startedOn: existing?.startedOn || todayIsoDate(),
      finishedOn: completed ? todayIsoDate() : null,
      rewatchCount: existing?.rewatchCount || 0,
      notes: existing?.notes || null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [libraryEntries.userId, libraryEntries.entityId],
      set: {
        status,
        progressCurrent: next,
        progressTotal: total,
        finishedOn: completed ? todayIsoDate() : null,
        updatedAt: now,
      },
    });

  await db.insert(watchEvents).values({
    id: crypto.randomUUID(),
    userId: input.userId,
    entityId: input.entityId,
    episodeId: null,
    eventType: "show_advanced",
    watchedOn: todayIsoDate(),
    createdAt: now,
  });

  const entries = await listLibraryEntries(input.userId);
  return { entry: entries.find((e) => e.entityId === input.entityId)!, conflict: false };
}
