import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "void/db";
import { castCredits, crewCredits, people } from "../../db/schema";
import { insertChunks, type Statement } from "../db/kernel";
import type { CastInput, CrewInput } from "../../shared/types/metadata";
import type { MediaType } from "./media";
import { toPersonId } from "./people";

function dedupeByCreditId<T extends { creditId: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.creditId, item])).values());
}

// A full refresh: a person dropped from the title should disappear, so we
// replace the media's credits (delete + chunked inserts) rather than upserting
// row-by-row. Returned as statements for the atomic hydration batch.
export function mediaCreditsWrite(
  mediaId: string,
  cast: CastInput[],
  crew: CrewInput[],
): Statement[] {
  const now = Date.now();

  const castRows = dedupeByCreditId(cast).map((c) => ({
    id: c.creditId,
    mediaId,
    personId: toPersonId(c.personTmdbId),
    character: c.character,
    billingOrder: c.billingOrder,
    episodeCount: c.episodeCount,
    createdAt: now,
    updatedAt: now,
  }));
  const crewRows = dedupeByCreditId(crew).map((c) => ({
    id: c.creditId,
    mediaId,
    personId: toPersonId(c.personTmdbId),
    department: c.department,
    job: c.job,
    episodeCount: c.episodeCount,
    createdAt: now,
    updatedAt: now,
  }));

  return [
    db.delete(castCredits).where(eq(castCredits.mediaId, mediaId)),
    ...insertChunks(castRows, (part) => db.insert(castCredits).values(part)),
    db.delete(crewCredits).where(eq(crewCredits.mediaId, mediaId)),
    ...insertChunks(crewRows, (part) => db.insert(crewCredits).values(part)),
  ];
}

export type CastView = {
  id: string;
  personId: string;
  name: string;
  slug: string;
  profilePath: string | null;
  character: string | null;
  episodeCount: number | null;
};

export type CrewView = {
  id: string;
  personId: string;
  name: string;
  slug: string;
  profilePath: string | null;
  department: string;
  job: string;
  episodeCount: number | null;
};

export type CrewGroup<T> = {
  department: string;
  members: T[];
};

// Crew jobs surfaced on the media page before "show all".
const KEY_CREW_JOBS = [
  "Director",
  "Creator",
  "Writer",
  "Screenplay",
  "Story",
  "Original Music Composer",
];

const castColumns = {
  id: castCredits.id,
  personId: castCredits.personId,
  name: people.name,
  slug: people.slug,
  profilePath: people.profilePath,
  character: castCredits.character,
  episodeCount: castCredits.episodeCount,
};

const crewColumns = {
  id: crewCredits.id,
  personId: crewCredits.personId,
  name: people.name,
  slug: people.slug,
  profilePath: people.profilePath,
  department: crewCredits.department,
  job: crewCredits.job,
  episodeCount: crewCredits.episodeCount,
};

// Shows rank by episodes appeared in; movies by billing order.
export async function listCast(
  mediaId: string,
  mediaType: MediaType,
  limit?: number,
): Promise<CastView[]> {
  const order =
    mediaType === "show"
      ? [desc(castCredits.episodeCount), asc(castCredits.billingOrder)]
      : [asc(castCredits.billingOrder)];

  let query = db
    .select(castColumns)
    .from(castCredits)
    .innerJoin(people, eq(castCredits.personId, people.id))
    .where(eq(castCredits.mediaId, mediaId))
    .orderBy(...order)
    .$dynamic();
  if (limit !== undefined) query = query.limit(limit);
  return query;
}

const KEY_CREW_PREVIEW = 8;

export async function listKeyCrew(mediaId: string): Promise<CrewView[]> {
  return db
    .select(crewColumns)
    .from(crewCredits)
    .innerJoin(people, eq(crewCredits.personId, people.id))
    .where(and(eq(crewCredits.mediaId, mediaId), inArray(crewCredits.job, KEY_CREW_JOBS)))
    .orderBy(desc(crewCredits.episodeCount))
    .limit(KEY_CREW_PREVIEW);
}

export async function listAllCrew(mediaId: string): Promise<CrewView[]> {
  return db
    .select(crewColumns)
    .from(crewCredits)
    .innerJoin(people, eq(crewCredits.personId, people.id))
    .where(eq(crewCredits.mediaId, mediaId))
    .orderBy(asc(crewCredits.department), desc(crewCredits.episodeCount), asc(crewCredits.job));
}

export function groupByDepartment<T extends { department: string }>(items: T[]): CrewGroup<T>[] {
  const byDepartment = new Map<string, T[]>();
  for (const item of items) {
    const list = byDepartment.get(item.department) ?? [];
    list.push(item);
    byDepartment.set(item.department, list);
  }
  return Array.from(byDepartment, ([department, members]) => ({ department, members }));
}

async function countRows(table: typeof castCredits | typeof crewCredits, mediaId: string) {
  const rows = await db
    .select({ n: sql<number>`count(*)` })
    .from(table)
    .where(eq(table.mediaId, mediaId));
  return rows[0]?.n ?? 0;
}

export function countCast(mediaId: string) {
  return countRows(castCredits, mediaId);
}

export function countCrew(mediaId: string) {
  return countRows(crewCredits, mediaId);
}
