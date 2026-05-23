import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { count, eq } from "drizzle-orm";
import { entities, entityGenres, movies, shows, users } from "./schema";

interface SeedEntry {
  id: string;
  type: "movie" | "show";
  tmdbId: number;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  genreIds: number[];
  genreNames: string[];
  releaseDate: string | null;
  firstAirDate: string | null;
  voteAverage: number | null;
  voteCount: number | null;
  popularity: number | null;
  fetchedAt: string;
}

function hashPassword(password: string): string {
  const sha = createHash("sha256").update(password).digest("hex");
  return `sha256:${sha}`;
}

function slugify(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

export default async function seed({ db }: { db: BetterSQLite3Database }) {
  const now = new Date().toISOString();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "dev@example.com"))
    .limit(1);

  if (!existing) {
    await db.insert(users).values({
      id: crypto.randomUUID(),
      email: "dev@example.com",
      username: "dev",
      passwordHash: hashPassword("password"),
      scoreSystem: "100",
      isAdmin: true,
      isExcludedFromAggregation: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  const [row] = await db.select({ count: count() }).from(entities);
  if ((row?.count ?? 0) > 0) {
    console.log(`Seed skipped; ${row?.count} entities already exist.`);
    return;
  }

  const seedPath = resolve(process.cwd(), "server/assets/seed/tmdb-media.seed.json");
  const catalog: { entries: SeedEntry[] } = JSON.parse(await readFile(seedPath, "utf-8"));

  for (const entry of catalog.entries) {
    const slug = `${entry.type}-${slugify(entry.title, String(entry.tmdbId))}-${entry.tmdbId}`;

    await db
      .insert(entities)
      .values({
        id: entry.id,
        type: entry.type,
        slug,
        title: entry.title,
        originalTitle: entry.originalTitle,
        overview: entry.overview,
        posterPath: entry.posterPath,
        backdropPath: entry.backdropPath,
        tmdbId: entry.tmdbId,
        releaseDate: entry.releaseDate,
        firstAirDate: entry.firstAirDate,
        voteAverage: entry.voteAverage,
        voteCount: entry.voteCount,
        popularity: entry.popularity,
        fetchedAt: entry.fetchedAt,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    if (entry.genreIds.length) {
      await db
        .insert(entityGenres)
        .values(
          entry.genreIds.map((id, i) => ({
            entityId: entry.id,
            genreId: id,
            genreName: entry.genreNames[i] ?? "",
          })),
        )
        .onConflictDoNothing();
    }

    if (entry.type === "movie") {
      await db.insert(movies).values({ entityId: entry.id }).onConflictDoNothing();
    } else {
      await db.insert(shows).values({ entityId: entry.id }).onConflictDoNothing();
    }
  }

  console.log(`Seeded ${catalog.entries.length} fixture entities.`);
}
