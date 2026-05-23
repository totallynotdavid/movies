import { asc, count, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "void/db";
import { entities, entityGenres } from "../db/schema";
import type { MediaEntityRow } from "./tmdb-mapper";

function toMediaEntity(
  row: typeof entities.$inferSelect,
  genres: Array<{ genreId: number; genreName: string }>,
): MediaEntityRow {
  return {
    id: row.id,
    type: row.type,
    tmdbId: row.tmdbId,
    slug: row.slug,
    title: row.title,
    originalTitle: row.originalTitle,
    overview: row.overview,
    posterPath: row.posterPath,
    backdropPath: row.backdropPath,
    genreIds: genres.map((g) => g.genreId),
    genreNames: genres.map((g) => g.genreName),
    releaseDate: row.releaseDate,
    firstAirDate: row.firstAirDate,
    voteAverage: row.voteAverage,
    voteCount: row.voteCount,
    popularity: row.popularity,
    fetchedAt: row.fetchedAt,
  };
}

async function attachGenres(rows: (typeof entities.$inferSelect)[]): Promise<MediaEntityRow[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const genreRows = await db.select().from(entityGenres).where(inArray(entityGenres.entityId, ids));

  return rows.map((row) => {
    const genres = genreRows.filter((g) => g.entityId === row.id);
    return toMediaEntity(row, genres);
  });
}

export async function searchEntities(
  input: { q?: string; type?: "movie" | "show"; limit?: number } = {},
): Promise<MediaEntityRow[]> {
  const limit = Math.min(Math.max(input.limit || 20, 1), 1000);

  const rows = await db
    .select()
    .from(entities)
    .where(
      input.type && input.q?.trim()
        ? or(eq(entities.type, input.type))
        : input.type
          ? eq(entities.type, input.type)
          : undefined,
    )
    .orderBy(desc(entities.popularity), asc(entities.title))
    .limit(limit);

  const filtered = input.q?.trim()
    ? rows.filter((r) => r.title.toLowerCase().includes(input.q!.trim().toLowerCase()))
    : rows;

  return attachGenres(filtered);
}

export async function getEntityById(id: string): Promise<MediaEntityRow | null> {
  const [row] = await db
    .select()
    .from(entities)
    .where(or(eq(entities.id, id), eq(entities.slug, id)))
    .limit(1);

  if (!row) return null;
  const genres = await db.select().from(entityGenres).where(eq(entityGenres.entityId, row.id));

  return toMediaEntity(row, genres);
}

export async function countEntities(): Promise<number> {
  const [row] = await db.select({ count: count() }).from(entities);
  return row?.count ?? 0;
}

export async function upsertEntity(entity: MediaEntityRow): Promise<MediaEntityRow> {
  const now = new Date().toISOString();
  await db
    .insert(entities)
    .values({
      id: entity.id,
      type: entity.type,
      slug: entity.slug,
      title: entity.title,
      originalTitle: entity.originalTitle,
      overview: entity.overview,
      posterPath: entity.posterPath,
      backdropPath: entity.backdropPath,
      tmdbId: entity.tmdbId,
      releaseDate: entity.releaseDate,
      firstAirDate: entity.firstAirDate,
      voteAverage: entity.voteAverage,
      voteCount: entity.voteCount,
      popularity: entity.popularity,
      fetchedAt: entity.fetchedAt,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [entities.type, entities.tmdbId],
      set: {
        slug: entity.slug,
        title: entity.title,
        originalTitle: entity.originalTitle,
        overview: entity.overview,
        posterPath: entity.posterPath,
        backdropPath: entity.backdropPath,
        releaseDate: entity.releaseDate,
        firstAirDate: entity.firstAirDate,
        voteAverage: entity.voteAverage,
        voteCount: entity.voteCount,
        popularity: entity.popularity,
        fetchedAt: entity.fetchedAt,
        updatedAt: now,
      },
    });

  await db.delete(entityGenres).where(eq(entityGenres.entityId, entity.id));
  if (entity.genreIds.length) {
    await db.insert(entityGenres).values(
      entity.genreIds.map((genreId, i) => ({
        entityId: entity.id,
        genreId,
        genreName: entity.genreNames[i] || String(genreId),
      })),
    );
  }

  return (await getEntityById(entity.id)) ?? entity;
}

export async function upsertEntities(rows: MediaEntityRow[]): Promise<MediaEntityRow[]> {
  const persisted: MediaEntityRow[] = [];
  for (const entity of rows) {
    persisted.push(await upsertEntity(entity));
  }
  return persisted;
}
