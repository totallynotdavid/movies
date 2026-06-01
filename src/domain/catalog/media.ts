import { and, desc, eq, inArray, isNull, like, lt, or } from "drizzle-orm";
import { db } from "void/db";
import { media } from "@schema";
import { selectByIds, type Statement } from "@/db/kernel";
import type { MediaDetailScalars } from "@/shared/types/metadata";
import { attempt, err, ok, type Result } from "@/result";
import type { TrackingError } from "@/domain/errors";

export type MediaType = "movie" | "show";

// Raw TMDB status strings: movie statuses plus tv statuses (some overlap).
export type MediaStatus =
  | "Rumored"
  | "Planned"
  | "In Production"
  | "Post Production"
  | "Released"
  | "Returning Series"
  | "Ended"
  | "Canceled"
  | "Pilot";

const STATUS_LABELS: Record<MediaStatus, string> = {
  Rumored: "Rumored",
  Planned: "Planned",
  "In Production": "In production",
  "Post Production": "Post-production",
  Released: "Released",
  "Returning Series": "Ongoing",
  Ended: "Ended",
  Canceled: "Canceled",
  Pilot: "Pilot",
};

export function mediaStatusLabel(status: string | null): string | null {
  if (!status) return null;
  return STATUS_LABELS[status as MediaStatus] ?? status;
}

export type MediaRecord = typeof media.$inferSelect;

export type UpsertMediaInput = {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  slug: string;
  originalTitle?: string | null;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string | null;
  seasonCount?: number | null;
  episodeCount?: number | null;
  voteAverage?: number | null;
  voteCount?: number | null;
  popularity?: number | null;
};

export function toMediaId(mediaType: MediaType, tmdbId: number) {
  return `tmdb:${mediaType}:${tmdbId}`;
}

export async function listMedia(input: { type?: MediaType; limit?: number } = {}) {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 200);

  if (input.type) {
    return db
      .select()
      .from(media)
      .where(eq(media.mediaType, input.type))
      .orderBy(desc(media.popularity))
      .limit(limit);
  }

  return db.select().from(media).orderBy(desc(media.popularity)).limit(limit);
}

export async function findMedia(mediaId: string): Promise<Result<MediaRecord, TrackingError>> {
  const rows = await attempt(
    db.select().from(media).where(eq(media.id, mediaId)).limit(1),
    (cause): TrackingError => ({ kind: "persistence_failed", cause }),
  );
  if (!rows.ok) return rows;
  const record = rows.value[0];
  return record ? ok(record) : err({ kind: "media_not_found", mediaId });
}

export async function findMediaBySlug(slug: string): Promise<MediaRecord | null> {
  const rows = await db.select().from(media).where(eq(media.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function searchLocalMedia(query: string, limit = 20) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const q = `%${query.trim()}%`;

  return db
    .select()
    .from(media)
    .where(or(like(media.title, q), like(media.originalTitle, q)))
    .orderBy(desc(media.popularity))
    .limit(safeLimit);
}

// Media whose details are not fresh: never hydrated (stub/failed) or past the TTL
// (stale). The reconcile cron drains this off the request path, most-popular
// first, bounded per run. Idempotent: a permanently-failed row simply reappears.
export async function listMediaNeedingDetails(
  ttlMs: number,
  limit: number,
): Promise<MediaRecord[]> {
  const cutoff = Date.now() - ttlMs;
  return db
    .select()
    .from(media)
    .where(or(isNull(media.detailsHydratedAt), lt(media.detailsHydratedAt, cutoff)))
    .orderBy(desc(media.popularity))
    .limit(limit);
}

export async function findMediaByTmdbIds(items: Array<{ mediaType: MediaType; tmdbId: number }>) {
  if (items.length === 0) return [];

  // `inArray` binds one parameter per id and a prolific person's filmography can
  // carry hundreds, so chunk each media-type's id list under the D1 cap.
  const byType = new Map<MediaType, number[]>();
  for (const item of items) {
    const list = byType.get(item.mediaType) ?? [];
    list.push(item.tmdbId);
    byType.set(item.mediaType, list);
  }

  const results: MediaRecord[] = [];
  for (const [mediaType, ids] of byType) {
    const rows = await selectByIds(ids, (batch) =>
      db
        .select()
        .from(media)
        .where(and(eq(media.mediaType, mediaType), inArray(media.tmdbId, batch))),
    );
    results.push(...rows);
  }
  return results;
}

export async function upsertMediaFromTmdb(input: UpsertMediaInput) {
  const now = Date.now();
  const id = toMediaId(input.mediaType, input.tmdbId);

  await db
    .insert(media)
    .values({
      id,
      mediaType: input.mediaType,
      tmdbId: input.tmdbId,
      slug: input.slug,
      title: input.title,
      originalTitle: input.originalTitle ?? input.title,
      overview: input.overview ?? null,
      posterPath: input.posterPath ?? null,
      backdropPath: input.backdropPath ?? null,
      releaseDate: input.releaseDate ?? null,
      seasonCount: input.seasonCount ?? null,
      episodeCount: input.episodeCount ?? null,
      voteAverage: input.voteAverage ?? null,
      voteCount: input.voteCount ?? null,
      popularity: input.popularity ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [media.mediaType, media.tmdbId],
      set: {
        mediaType: input.mediaType,
        slug: input.slug,
        title: input.title,
        originalTitle: input.originalTitle ?? input.title,
        overview: input.overview ?? null,
        posterPath: input.posterPath ?? null,
        backdropPath: input.backdropPath ?? null,
        releaseDate: input.releaseDate ?? null,
        seasonCount: input.seasonCount ?? null,
        episodeCount: input.episodeCount ?? null,
        voteAverage: input.voteAverage ?? null,
        voteCount: input.voteCount ?? null,
        popularity: input.popularity ?? null,
        updatedAt: now,
      },
    });

  return id;
}

// Writes the Tier-1 detail scalars onto an existing media row, stamps the
// freshness marker, and clears any prior error, all as one statement so the
// hydration batch commits the row and its marker atomically. Cast/crew/genres/
// companies/titles are separate statements in the same batch.
export function mediaScalarsWrite(mediaId: string, scalars: MediaDetailScalars): Statement[] {
  const now = Date.now();
  return [
    db
      .update(media)
      .set({
        title: scalars.title,
        originalTitle: scalars.originalTitle,
        overview: scalars.overview,
        tagline: scalars.tagline,
        posterPath: scalars.posterPath,
        backdropPath: scalars.backdropPath,
        releaseDate: scalars.releaseDate,
        lastAirDate: scalars.lastAirDate,
        runtime: scalars.runtime,
        seasonCount: scalars.seasonCount,
        episodeCount: scalars.episodeCount,
        status: scalars.status as MediaRecord["status"],
        inProduction: scalars.inProduction,
        originalLanguage: scalars.originalLanguage,
        certification: scalars.certification,
        imdbId: scalars.imdbId,
        voteAverage: scalars.voteAverage,
        voteCount: scalars.voteCount,
        popularity: scalars.popularity,
        detailsHydratedAt: now,
        detailsError: null,
        updatedAt: now,
      })
      .where(eq(media.id, mediaId)),
  ];
}

// Records a Tier-1 hydration failure durably so it becomes observable state
// rather than a swallowed exception.
export function markDetailsFailedWrite(mediaId: string, error: string): Statement[] {
  const now = Date.now();
  return [
    db.update(media).set({ detailsError: error, updatedAt: now }).where(eq(media.id, mediaId)),
  ];
}
