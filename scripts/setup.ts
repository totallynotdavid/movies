import { execSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();

function run(cmd: string) {
  execSync(cmd, { stdio: "inherit", cwd: root });
}

function esc(v: string | null): string {
  if (v === null) return "NULL";
  return `'${v.replace(/'/g, "''")}'`;
}

function num(v: number | null): string {
  return v === null ? "NULL" : String(v);
}

type MediaFixture = {
  id: string;
  mediaType: string;
  provider: string;
  providerId: number;
  slug: string;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
  voteCount: number | null;
  popularity: number | null;
};

function main() {
  const now = Date.now();
  const media = JSON.parse(
    readFileSync(join(root, "fixtures/media.json"), "utf8"),
  ) as MediaFixture[];

  const lines = [
    `INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('bootstrap-admin', 'admin@example.com', 'Bootstrap Admin', 'admin', ${now}, ${now});`,
    ...media.map(
      (m) =>
        `INSERT OR IGNORE INTO media (id, media_type, provider, provider_id, slug, title, original_title, overview, poster_path, backdrop_path, release_date, vote_average, vote_count, popularity, created_at, updated_at) ` +
        `VALUES (${esc(m.id)}, ${esc(m.mediaType)}, ${esc(m.provider)}, ${m.providerId}, ${esc(m.slug)}, ${esc(m.title)}, ${esc(m.originalTitle)}, ${esc(m.overview)}, ${esc(m.posterPath)}, ${esc(m.backdropPath)}, ${esc(m.releaseDate)}, ${num(m.voteAverage)}, ${num(m.voteCount)}, ${num(m.popularity)}, ${now}, ${now});`,
    ),
  ];

  console.log("▶ applying migrations...");
  run("bun run db:migrate");

  const sqlFile = join(tmpdir(), `track-seed-${now}.sql`);
  writeFileSync(sqlFile, lines.join("\n"));

  try {
    console.log(`▶ seeding catalog (${media.length} items)...`);
    run(`bunx void db execute --file "${sqlFile}"`);
  } finally {
    rmSync(sqlFile, { force: true });
  }

  console.log("✓ ready");
}

try {
  main();
} catch (err) {
  process.stderr.write(`setup failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
}
