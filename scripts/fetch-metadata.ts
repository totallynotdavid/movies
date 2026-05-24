import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { MediaFixture } from "../fixtures/types";

const CONFIG = {
  trending: { movies: 30, shows: 20 },
  topRated: { movies: 20, shows: 20 },
} as const;

const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbGet(token: string, path: string, params: Record<string, string> = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("language", "en-US");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`TMDB ${path} → ${res.status} ${res.statusText}`);
  return res.json() as Promise<{ results?: unknown[] }>;
}

async function fetchPaged(token: string, path: string, limit: number): Promise<unknown[]> {
  const out: unknown[] = [];
  for (let page = 1; out.length < limit; page++) {
    const data = await tmdbGet(token, path, { page: String(page) });
    const results = data.results ?? [];
    if (results.length === 0) break;
    out.push(...results);
  }
  return out.slice(0, limit);
}

// mappers

type Raw = Record<string, unknown>;

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

function toSlug(title: string, id: number): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return `${base || "item"}-${id}`;
}

function mapMovie(raw: Raw): MediaFixture {
  const title = str(raw["title"]) ?? str(raw["name"]) ?? "Unknown";
  const id = Number(raw["id"]);
  return {
    id: `tmdb:movie:${id}`,
    mediaType: "movie",
    provider: "tmdb",
    providerId: id,
    slug: toSlug(title, id),
    title,
    originalTitle: str(raw["original_title"]),
    overview: str(raw["overview"]),
    posterPath: str(raw["poster_path"]),
    backdropPath: str(raw["backdrop_path"]),
    releaseDate: str(raw["release_date"]),
    voteAverage: num(raw["vote_average"]),
    voteCount: num(raw["vote_count"]),
    popularity: num(raw["popularity"]),
  };
}

function mapShow(raw: Raw): MediaFixture {
  const title = str(raw["name"]) ?? str(raw["title"]) ?? "Unknown";
  const id = Number(raw["id"]);
  return {
    id: `tmdb:show:${id}`,
    mediaType: "show",
    provider: "tmdb",
    providerId: id,
    slug: toSlug(title, id),
    title,
    originalTitle: str(raw["original_name"]),
    overview: str(raw["overview"]),
    posterPath: str(raw["poster_path"]),
    backdropPath: str(raw["backdrop_path"]),
    releaseDate: str(raw["first_air_date"]),
    voteAverage: num(raw["vote_average"]),
    voteCount: num(raw["vote_count"]),
    popularity: num(raw["popularity"]),
  };
}

function dedup(items: MediaFixture[]): MediaFixture[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

// main

async function main() {
  const token = process.env["TMDB_READ_ACCESS_TOKEN"];
  if (!token) {
    process.stderr.write("Error: TMDB_READ_ACCESS_TOKEN is required\n");
    process.exit(1);
  }

  const mode = process.argv.includes("--trending") ? "trending" : "all";
  const root = process.cwd();
  const mediaPath = join(root, "fixtures/media.json");
  const metaPath = join(root, "fixtures/meta.json");

  // In trending mode, preserve existing items not covered by the trending fetch
  let existing: MediaFixture[] = [];
  if (mode === "trending" && existsSync(mediaPath)) {
    existing = JSON.parse(readFileSync(mediaPath, "utf8")) as MediaFixture[];
    console.log(`Loaded ${existing.length} existing items (preserving non-trending)`);
  }

  console.log(`\nFetching from TMDB (mode: ${mode})...`);
  const fetched: MediaFixture[] = [];

  if (mode === "all") {
    console.log(`  top-rated movies (${CONFIG.topRated.movies})...`);
    const data = await fetchPaged(token, "/movie/top_rated", CONFIG.topRated.movies);
    fetched.push(...(data as Raw[]).map(mapMovie));

    console.log(`  top-rated shows (${CONFIG.topRated.shows})...`);
    const tvData = await fetchPaged(token, "/tv/top_rated", CONFIG.topRated.shows);
    fetched.push(...(tvData as Raw[]).map(mapShow));
  }

  console.log(`  trending movies (${CONFIG.trending.movies})...`);
  const trendMovies = await fetchPaged(token, "/trending/movie/week", CONFIG.trending.movies);
  fetched.push(...(trendMovies as Raw[]).map(mapMovie));

  console.log(`  trending shows (${CONFIG.trending.shows})...`);
  const trendShows = await fetchPaged(token, "/trending/tv/week", CONFIG.trending.shows);
  fetched.push(...(trendShows as Raw[]).map(mapShow));

  // Merge: fetched items take precedence; in trending mode, non-fetched existing items are kept
  const fetchedIds = new Set(fetched.map((i) => i.id));
  const preserved = mode === "trending" ? existing.filter((i) => !fetchedIds.has(i.id)) : [];
  const merged = dedup([...fetched, ...preserved]);
  merged.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

  const movieCount = merged.filter((i) => i.mediaType === "movie").length;
  const showCount = merged.filter((i) => i.mediaType === "show").length;

  writeFileSync(mediaPath, JSON.stringify(merged, null, 2) + "\n");
  writeFileSync(
    metaPath,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        mode,
        config: CONFIG,
        counts: { total: merged.length, movies: movieCount, shows: showCount },
      },
      null,
      2,
    ) + "\n",
  );

  console.log(`\n✓ ${merged.length} items written to fixtures/media.json`);
  console.log(`  ${movieCount} movies · ${showCount} shows`);
  console.log(`\nNext: git add fixtures/ && git commit -m "chore: refresh media fixtures"`);
}

main().catch((err: unknown) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
