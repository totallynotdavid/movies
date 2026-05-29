import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "void/db";
import { activityEvents, libraryEntries, media } from "../../db/schema";
import type { LibraryStatus } from "./library";

type MediaRecord = typeof media.$inferSelect;
type LibraryEntryRecord = typeof libraryEntries.$inferSelect;
type ActivityEventRecord = typeof activityEvents.$inferInsert;

type SnapshotInput = {
  userId: string;
  mediaId: string;
  status: LibraryStatus;
  score100?: number | null;
  progressCurrent?: number;
  progressTotal?: number | null;
  notes?: string | null;
  occurredAt?: number;
  occurredOn?: string;
};

type WatchInput = {
  userId: string;
  mediaId: string;
  occurredAt: number;
  occurredOn: string;
};

type FormatStatsSource = {
  mediaType: "movie" | "show";
  score100: number | null;
};

type WatchDaySource = {
  mediaType: "movie" | "show";
  occurredOn: string;
};

type CalendarCount = {
  occurredOn: string;
  count: number;
};

export type ProfileFormatStats = Record<
  "movie" | "show",
  {
    tracked: number;
    watchDays: number;
    averageScore100: number | null;
  }
>;

export type ProfileCalendarDay = {
  date: string;
  count: number;
};

export type ProfileActivityItem = {
  id: string;
  kind: "movie_watched" | "episode_watched" | "media_completed";
  mediaId: string;
  mediaType: "movie" | "show";
  title: string;
  slug: string;
  occurredAt: number;
  occurredOn: string;
  episodeNumber: number | null;
  progressCurrent: number | null;
  progressTotal: number | null;
};

const watchEventKinds = ["movie_watched", "episode_watched"] as const;

function createActivityEvent(input: Omit<ActivityEventRecord, "id">): ActivityEventRecord {
  return {
    id: crypto.randomUUID(),
    ...input,
  };
}

function toOccurredOn(occurredAt: number) {
  return new Date(occurredAt).toISOString().slice(0, 10);
}

function mergeSnapshot(input: {
  existingEntry: LibraryEntryRecord | null;
  mediaRecord: MediaRecord;
  next: SnapshotInput;
  updatedAt: number;
}): LibraryEntryRecord {
  const { existingEntry, mediaRecord, next, updatedAt } = input;
  const fallbackProgressTotal =
    mediaRecord.mediaType === "show" ? (mediaRecord.episodeCount ?? null) : null;

  return {
    id: existingEntry?.id ?? `${next.userId}:${next.mediaId}`,
    userId: next.userId,
    mediaId: next.mediaId,
    status: next.status,
    score100: next.score100 !== undefined ? next.score100 : (existingEntry?.score100 ?? null),
    progressCurrent:
      next.progressCurrent !== undefined
        ? next.progressCurrent
        : (existingEntry?.progressCurrent ?? 0),
    progressTotal:
      next.progressTotal !== undefined
        ? next.progressTotal
        : (existingEntry?.progressTotal ?? fallbackProgressTotal),
    notes: next.notes !== undefined ? next.notes : (existingEntry?.notes ?? null),
    updatedAt,
  };
}

function buildManualCompletionEvent(input: {
  existingEntry: LibraryEntryRecord | null;
  entry: LibraryEntryRecord;
  mediaRecord: MediaRecord;
  occurredAt: number;
  occurredOn: string;
}) {
  const { existingEntry, entry, mediaRecord, occurredAt, occurredOn } = input;
  if (entry.status !== "completed") return null;
  if (existingEntry?.status === "completed") return null;

  return createActivityEvent({
    userId: entry.userId,
    mediaId: entry.mediaId,
    kind: "media_completed",
    mediaType: mediaRecord.mediaType,
    occurredAt,
    occurredOn,
    episodeNumber: null,
    progressCurrent: entry.progressCurrent,
    progressTotal: entry.progressTotal,
  });
}

export function buildMovieWatchUpdate(input: {
  existingEntry: LibraryEntryRecord | null;
  mediaRecord: MediaRecord;
  watch: WatchInput;
}) {
  const { existingEntry, mediaRecord, watch } = input;

  if (mediaRecord.mediaType !== "movie") {
    throw new Error("Only movies can be logged with this route");
  }

  const entry = mergeSnapshot({
    existingEntry,
    mediaRecord,
    next: {
      userId: watch.userId,
      mediaId: watch.mediaId,
      status: "completed",
    },
    updatedAt: watch.occurredAt,
  });

  return {
    entry,
    event: createActivityEvent({
      userId: watch.userId,
      mediaId: watch.mediaId,
      kind: "movie_watched",
      mediaType: mediaRecord.mediaType,
      occurredAt: watch.occurredAt,
      occurredOn: watch.occurredOn,
      episodeNumber: null,
      progressCurrent: entry.progressCurrent,
      progressTotal: entry.progressTotal,
    }),
  };
}

export function buildShowEpisodeUpdate(input: {
  existingEntry: LibraryEntryRecord | null;
  mediaRecord: MediaRecord;
  watch: WatchInput;
}) {
  const { existingEntry, mediaRecord, watch } = input;

  if (mediaRecord.mediaType !== "show") {
    throw new Error("Only shows can be logged with this route");
  }

  const progressCurrent = existingEntry?.progressCurrent ?? 0;
  const progressTotal = existingEntry?.progressTotal ?? mediaRecord.episodeCount ?? null;

  if (progressTotal !== null && progressCurrent >= progressTotal) {
    throw new Error("This show is already at its known episode total");
  }

  const nextProgressCurrent = progressCurrent + 1;
  const nextStatus =
    progressTotal !== null && nextProgressCurrent >= progressTotal ? "completed" : "watching";

  const entry = mergeSnapshot({
    existingEntry,
    mediaRecord,
    next: {
      userId: watch.userId,
      mediaId: watch.mediaId,
      status: nextStatus,
      progressCurrent: nextProgressCurrent,
      progressTotal,
    },
    updatedAt: watch.occurredAt,
  });

  return {
    entry,
    event: createActivityEvent({
      userId: watch.userId,
      mediaId: watch.mediaId,
      kind: "episode_watched",
      mediaType: mediaRecord.mediaType,
      occurredAt: watch.occurredAt,
      occurredOn: watch.occurredOn,
      episodeNumber: nextProgressCurrent,
      progressCurrent: nextProgressCurrent,
      progressTotal,
    }),
  };
}

export function buildProfileFormatStats(
  libraryRows: FormatStatsSource[],
  watchRows: WatchDaySource[],
): ProfileFormatStats {
  const totals = {
    movie: { tracked: 0, watchDays: 0, averageScore100: null as number | null },
    show: { tracked: 0, watchDays: 0, averageScore100: null as number | null },
  };
  const ratingSums = { movie: 0, show: 0 };
  const ratingCounts = { movie: 0, show: 0 };
  const watchDays = {
    movie: new Set<string>(),
    show: new Set<string>(),
  };

  for (const row of libraryRows) {
    const bucket = totals[row.mediaType];
    bucket.tracked += 1;

    if (row.score100 !== null) {
      ratingSums[row.mediaType] += row.score100;
      ratingCounts[row.mediaType] += 1;
    }
  }

  for (const row of watchRows) {
    watchDays[row.mediaType].add(row.occurredOn);
  }

  for (const mediaType of ["movie", "show"] as const) {
    totals[mediaType].watchDays = watchDays[mediaType].size;
    totals[mediaType].averageScore100 =
      ratingCounts[mediaType] > 0 ? ratingSums[mediaType] / ratingCounts[mediaType] : null;
  }

  return totals;
}

export function buildActivityCalendar(
  rows: CalendarCount[],
  days = 365,
  today = new Date(),
): ProfileCalendarDay[] {
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const countByDay = new Map<string, number>();
  for (const row of rows) {
    countByDay.set(row.occurredOn, (countByDay.get(row.occurredOn) ?? 0) + row.count);
  }

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      count: countByDay.get(key) ?? 0,
    };
  });
}

export function sortProfileActivity<T extends { occurredAt: number }>(rows: T[]) {
  return [...rows].sort((left, right) => right.occurredAt - left.occurredAt);
}

async function getLibraryContext(userId: string, mediaId: string) {
  const [mediaRows, libraryRows] = await Promise.all([
    db.select().from(media).where(eq(media.id, mediaId)).limit(1),
    db
      .select()
      .from(libraryEntries)
      .where(and(eq(libraryEntries.userId, userId), eq(libraryEntries.mediaId, mediaId)))
      .limit(1),
  ]);

  return {
    mediaRecord: mediaRows[0] ?? null,
    existingEntry: libraryRows[0] ?? null,
  };
}

function upsertLibrarySnapshot(entry: LibraryEntryRecord) {
  return db
    .insert(libraryEntries)
    .values(entry)
    .onConflictDoUpdate({
      target: [libraryEntries.userId, libraryEntries.mediaId],
      set: {
        status: entry.status,
        score100: entry.score100,
        progressCurrent: entry.progressCurrent,
        progressTotal: entry.progressTotal,
        notes: entry.notes,
        updatedAt: entry.updatedAt,
      },
    });
}

export async function saveLibraryEntrySnapshot(input: SnapshotInput) {
  const { mediaRecord, existingEntry } = await getLibraryContext(input.userId, input.mediaId);
  if (!mediaRecord) {
    throw new Error("Media not found");
  }

  const occurredAt = input.occurredAt ?? Date.now();
  const occurredOn = input.occurredOn ?? toOccurredOn(occurredAt);
  const entry = mergeSnapshot({
    existingEntry,
    mediaRecord,
    next: input,
    updatedAt: occurredAt,
  });
  const completionEvent = buildManualCompletionEvent({
    existingEntry,
    entry,
    mediaRecord,
    occurredAt,
    occurredOn,
  });

  if (completionEvent) {
    await db.batch([
      upsertLibrarySnapshot(entry),
      db.insert(activityEvents).values(completionEvent),
    ]);
  } else {
    await db.batch([upsertLibrarySnapshot(entry)]);
  }

  return entry;
}

export async function logMovieWatch(input: WatchInput) {
  const { mediaRecord, existingEntry } = await getLibraryContext(input.userId, input.mediaId);
  if (!mediaRecord) {
    throw new Error("Media not found");
  }

  const update = buildMovieWatchUpdate({ existingEntry, mediaRecord, watch: input });
  await db.batch([
    upsertLibrarySnapshot(update.entry),
    db.insert(activityEvents).values(update.event),
  ]);

  return update.entry;
}

export async function logShowEpisode(input: WatchInput) {
  const { mediaRecord, existingEntry } = await getLibraryContext(input.userId, input.mediaId);
  if (!mediaRecord) {
    throw new Error("Media not found");
  }

  const update = buildShowEpisodeUpdate({ existingEntry, mediaRecord, watch: input });
  await db.batch([
    upsertLibrarySnapshot(update.entry),
    db.insert(activityEvents).values(update.event),
  ]);

  return update.entry;
}

export async function getProfileFormatStats(userId: string) {
  const [libraryRows, watchRows] = await Promise.all([
    db
      .select({
        mediaType: media.mediaType,
        score100: libraryEntries.score100,
      })
      .from(libraryEntries)
      .innerJoin(media, eq(libraryEntries.mediaId, media.id))
      .where(eq(libraryEntries.userId, userId)),
    db
      .select({
        mediaType: activityEvents.mediaType,
        occurredOn: activityEvents.occurredOn,
      })
      .from(activityEvents)
      .where(
        and(eq(activityEvents.userId, userId), inArray(activityEvents.kind, [...watchEventKinds])),
      ),
  ]);

  return buildProfileFormatStats(libraryRows, watchRows);
}

export async function getProfileActivityCalendar(userId: string, days = 365) {
  const calendarStart = buildActivityCalendar([], days)[0]?.date ?? toOccurredOn(Date.now());
  const rows = await db
    .select({
      occurredOn: activityEvents.occurredOn,
    })
    .from(activityEvents)
    .where(
      and(
        eq(activityEvents.userId, userId),
        inArray(activityEvents.kind, [...watchEventKinds]),
        gte(activityEvents.occurredOn, calendarStart),
      ),
    );

  const counts = Array.from(
    rows.reduce((acc, row) => {
      acc.set(row.occurredOn, (acc.get(row.occurredOn) ?? 0) + 1);
      return acc;
    }, new Map<string, number>()),
    ([occurredOn, count]) => ({ occurredOn, count }),
  );

  return buildActivityCalendar(counts, days);
}

export async function listProfileActivity(
  userId: string,
  limit = 20,
): Promise<ProfileActivityItem[]> {
  const rows = await db
    .select({
      id: activityEvents.id,
      kind: activityEvents.kind,
      mediaId: activityEvents.mediaId,
      mediaType: activityEvents.mediaType,
      title: media.title,
      slug: media.slug,
      occurredAt: activityEvents.occurredAt,
      occurredOn: activityEvents.occurredOn,
      episodeNumber: activityEvents.episodeNumber,
      progressCurrent: activityEvents.progressCurrent,
      progressTotal: activityEvents.progressTotal,
    })
    .from(activityEvents)
    .innerJoin(media, eq(activityEvents.mediaId, media.id))
    .where(eq(activityEvents.userId, userId))
    .orderBy(desc(activityEvents.occurredAt))
    .limit(limit);

  return sortProfileActivity(rows);
}
