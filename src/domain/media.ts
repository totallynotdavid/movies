import { and, desc, eq, inArray, like, or } from "drizzle-orm";
import { db } from "void/db";
import { media } from "../../db/schema";

export type MediaType = "movie" | "show";

export type UpsertMediaInput = {
  mediaType: MediaType;
  providerId: number;
  title: string;
  slug: string;
  originalTitle?: string | null;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  voteCount?: number | null;
  popularity?: number | null;
};

export function toMediaId(mediaType: MediaType, providerId: number) {
  return `tmdb:${mediaType}:${providerId}`;
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

export async function findMediaByTmdbIds(
  items: Array<{ mediaType: MediaType; providerId: number }>,
) {
  if (items.length === 0) return [];

  const byType = new Map<MediaType, number[]>();
  for (const item of items) {
    const list = byType.get(item.mediaType) ?? [];
    list.push(item.providerId);
    byType.set(item.mediaType, list);
  }

  const conditions = Array.from(byType.entries()).map(([mediaType, ids]) =>
    and(eq(media.mediaType, mediaType), inArray(media.providerId, ids)),
  );

  return db
    .select()
    .from(media)
    .where(or(...conditions));
}

export async function upsertMediaFromTmdb(input: UpsertMediaInput) {
  const now = Date.now();
  const id = toMediaId(input.mediaType, input.providerId);

  await db
    .insert(media)
    .values({
      id,
      mediaType: input.mediaType,
      provider: "tmdb",
      providerId: input.providerId,
      slug: input.slug,
      title: input.title,
      originalTitle: input.originalTitle ?? input.title,
      overview: input.overview ?? null,
      posterPath: input.posterPath ?? null,
      backdropPath: input.backdropPath ?? null,
      releaseDate: input.releaseDate ?? null,
      voteAverage: input.voteAverage ?? null,
      voteCount: input.voteCount ?? null,
      popularity: input.popularity ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [media.provider, media.providerId],
      set: {
        mediaType: input.mediaType,
        slug: input.slug,
        title: input.title,
        originalTitle: input.originalTitle ?? input.title,
        overview: input.overview ?? null,
        posterPath: input.posterPath ?? null,
        backdropPath: input.backdropPath ?? null,
        releaseDate: input.releaseDate ?? null,
        voteAverage: input.voteAverage ?? null,
        voteCount: input.voteCount ?? null,
        popularity: input.popularity ?? null,
        updatedAt: now,
      },
    });

  return id;
}
