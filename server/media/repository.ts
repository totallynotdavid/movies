import type { SqlDatabase } from "../db/client";
import type { MediaEntityRow } from "./tmdb-mapper";

function toMediaEntity(
  row: any,
  genres: Array<{ genre_id: number; genre_name: string }>,
): MediaEntityRow {
  return {
    id: row.id,
    type: row.type,
    tmdbId: row.tmdb_id,
    slug: row.slug,
    title: row.title,
    originalTitle: row.original_title,
    overview: row.overview,
    posterPath: row.poster_path,
    backdropPath: row.backdrop_path,
    genreIds: genres.map((item) => item.genre_id),
    genreNames: genres.map((item) => item.genre_name),
    releaseDate: row.release_date,
    firstAirDate: row.first_air_date,
    voteAverage: row.vote_average,
    voteCount: row.vote_count,
    popularity: row.popularity,
    fetchedAt: row.fetched_at,
  };
}

async function attachGenres(db: SqlDatabase, rows: any[]): Promise<MediaEntityRow[]> {
  const ids = rows.map((row) => row.id);
  if (!ids.length) return [];

  const genreRows = await db
    .selectFrom("entity_genres")
    .selectAll()
    .where("entity_id", "in", ids)
    .execute();

  return rows.map((row) => {
    const genres = genreRows.filter((genre) => genre.entity_id === row.id);
    return toMediaEntity(row, genres);
  });
}

export async function searchEntities(
  db: SqlDatabase,
  input: {
    q?: string;
    type?: "movie" | "show";
    limit?: number;
  } = {},
): Promise<MediaEntityRow[]> {
  const limit = Math.min(Math.max(input.limit || 20, 1), 1000);
  let query = db.selectFrom("entities").selectAll();

  if (input.type) {
    query = query.where("type", "=", input.type);
  }
  if (input.q?.trim()) {
    query = query.where("title", "like", `%${input.q.trim()}%`);
  }

  const rows = await query.orderBy("popularity desc").orderBy("title asc").limit(limit).execute();
  return await attachGenres(db, rows);
}

export async function getEntityById(db: SqlDatabase, id: string): Promise<MediaEntityRow | null> {
  const row = await db
    .selectFrom("entities")
    .selectAll()
    .where((eb) => eb.or([eb("id", "=", id), eb("slug", "=", id)]))
    .executeTakeFirst();

  if (!row) return null;
  const genres = await db
    .selectFrom("entity_genres")
    .selectAll()
    .where("entity_id", "=", row.id)
    .execute();

  return toMediaEntity(row, genres);
}

export async function countEntities(db: SqlDatabase): Promise<number> {
  const row = await db
    .selectFrom("entities")
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .executeTakeFirst();

  return Number(row?.count || 0);
}

export async function upsertEntity(
  db: SqlDatabase,
  entity: MediaEntityRow,
): Promise<MediaEntityRow> {
  const now = new Date().toISOString();
  await db
    .insertInto("entities")
    .values({
      id: entity.id,
      type: entity.type,
      slug: entity.slug,
      title: entity.title,
      original_title: entity.originalTitle,
      overview: entity.overview,
      poster_path: entity.posterPath,
      backdrop_path: entity.backdropPath,
      tmdb_id: entity.tmdbId,
      release_date: entity.releaseDate,
      first_air_date: entity.firstAirDate,
      vote_average: entity.voteAverage,
      vote_count: entity.voteCount,
      popularity: entity.popularity,
      fetched_at: entity.fetchedAt,
      created_at: now,
      updated_at: now,
    })
    .onConflict((oc) =>
      oc.columns(["type", "tmdb_id"]).doUpdateSet({
        slug: entity.slug,
        title: entity.title,
        original_title: entity.originalTitle,
        overview: entity.overview,
        poster_path: entity.posterPath,
        backdrop_path: entity.backdropPath,
        release_date: entity.releaseDate,
        first_air_date: entity.firstAirDate,
        vote_average: entity.voteAverage,
        vote_count: entity.voteCount,
        popularity: entity.popularity,
        fetched_at: entity.fetchedAt,
        updated_at: now,
      }),
    )
    .execute();

  await db.deleteFrom("entity_genres").where("entity_id", "=", entity.id).execute();
  if (entity.genreIds.length) {
    await db
      .insertInto("entity_genres")
      .values(
        entity.genreIds.map((genreId, index) => ({
          entity_id: entity.id,
          genre_id: genreId,
          genre_name: entity.genreNames[index] || String(genreId),
        })),
      )
      .execute();
  }

  return (await getEntityById(db, entity.id)) || entity;
}

export async function upsertEntities(
  db: SqlDatabase,
  entities: MediaEntityRow[],
): Promise<MediaEntityRow[]> {
  const persisted: MediaEntityRow[] = [];
  for (const entity of entities) {
    persisted.push(await upsertEntity(db, entity));
  }
  return persisted;
}
