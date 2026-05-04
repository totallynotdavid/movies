import type { LibraryEntry, TrackingStatus } from "#shared/types/tracking";
import type { SqlDatabase } from "../db/client";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function mapEntry(row: any): LibraryEntry {
  return {
    id: row.id,
    userId: row.user_id,
    entityId: row.entity_id,
    mediaType: row.media_type,
    title: row.title,
    status: row.status,
    score100: row.score100,
    progressCurrent: row.progress_current,
    progressTotal: row.progress_total,
    startedOn: row.started_on,
    finishedOn: row.finished_on,
    rewatchCount: row.rewatch_count,
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

export async function listLibraryEntries(db: SqlDatabase, userId: string): Promise<LibraryEntry[]> {
  const rows = await db
    .selectFrom("library_entries as le")
    .innerJoin("entities as e", "e.id", "le.entity_id")
    .selectAll("le")
    .select(["e.type as media_type", "e.title"])
    .where("le.user_id", "=", userId)
    .orderBy("le.updated_at desc")
    .execute();

  return rows.map(mapEntry);
}

export async function upsertMovieWatched(
  db: SqlDatabase,
  input: {
    userId: string;
    entityId: string;
    score100?: number | null;
    watchedOn?: string;
  },
): Promise<LibraryEntry> {
  const now = new Date().toISOString();
  const watchedOn = input.watchedOn || todayIsoDate();
  const existing = await db
    .selectFrom("library_entries")
    .select(["rewatch_count", "score100", "started_on"])
    .where("user_id", "=", input.userId)
    .where("entity_id", "=", input.entityId)
    .executeTakeFirst();

  await db
    .insertInto("library_entries")
    .values({
      id: crypto.randomUUID(),
      user_id: input.userId,
      entity_id: input.entityId,
      status: "completed",
      score100: input.score100 ?? existing?.score100 ?? null,
      progress_current: 1,
      progress_total: 1,
      started_on: existing?.started_on || watchedOn,
      finished_on: watchedOn,
      rewatch_count: existing ? existing.rewatch_count + 1 : 0,
      notes: null,
      updated_at: now,
    })
    .onConflict((oc) =>
      oc.columns(["user_id", "entity_id"]).doUpdateSet({
        status: "completed",
        score100: input.score100 ?? existing?.score100 ?? null,
        progress_current: 1,
        progress_total: 1,
        finished_on: watchedOn,
        rewatch_count: existing ? existing.rewatch_count + 1 : 0,
        updated_at: now,
      }),
    )
    .execute();

  await db
    .insertInto("watch_events")
    .values({
      id: crypto.randomUUID(),
      user_id: input.userId,
      entity_id: input.entityId,
      episode_id: null,
      event_type: "movie_completed",
      watched_on: watchedOn,
      created_at: now,
    })
    .execute();

  const entries = await listLibraryEntries(db, input.userId);
  return entries.find((entry) => entry.entityId === input.entityId)!;
}

export async function advanceShow(
  db: SqlDatabase,
  input: {
    userId: string;
    entityId: string;
    expectedNextEpisode?: number;
    totalEpisodes?: number | null;
  },
): Promise<{ entry: LibraryEntry; conflict: boolean }> {
  const now = new Date().toISOString();
  const existing = await db
    .selectFrom("library_entries")
    .selectAll()
    .where("user_id", "=", input.userId)
    .where("entity_id", "=", input.entityId)
    .executeTakeFirst();

  const current = existing?.progress_current || 0;
  const next = current + 1;
  const conflict =
    typeof input.expectedNextEpisode === "number" && input.expectedNextEpisode !== next;
  if (conflict && existing) {
    const entries = await listLibraryEntries(db, input.userId);
    return { entry: entries.find((entry) => entry.entityId === input.entityId)!, conflict: true };
  }

  const total = input.totalEpisodes ?? existing?.progress_total ?? null;
  const completed = typeof total === "number" ? next >= total : false;
  const status: TrackingStatus = completed ? "completed" : "watching";

  await db
    .insertInto("library_entries")
    .values({
      id: crypto.randomUUID(),
      user_id: input.userId,
      entity_id: input.entityId,
      status,
      score100: existing?.score100 ?? null,
      progress_current: next,
      progress_total: total,
      started_on: existing?.started_on || todayIsoDate(),
      finished_on: completed ? todayIsoDate() : null,
      rewatch_count: existing?.rewatch_count || 0,
      notes: existing?.notes || null,
      updated_at: now,
    })
    .onConflict((oc) =>
      oc.columns(["user_id", "entity_id"]).doUpdateSet({
        status,
        progress_current: next,
        progress_total: total,
        finished_on: completed ? todayIsoDate() : null,
        updated_at: now,
      }),
    )
    .execute();

  await db
    .insertInto("watch_events")
    .values({
      id: crypto.randomUUID(),
      user_id: input.userId,
      entity_id: input.entityId,
      episode_id: null,
      event_type: "show_advanced",
      watched_on: todayIsoDate(),
      created_at: now,
    })
    .execute();

  const entries = await listLibraryEntries(db, input.userId);
  return { entry: entries.find((entry) => entry.entityId === input.entityId)!, conflict: false };
}
