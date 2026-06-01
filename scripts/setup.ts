import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function run(cmd: string) {
  execSync(cmd, { stdio: "inherit", cwd: root });
}

function esc(v: string | null | undefined): string {
  if (v == null) return "NULL";
  return `'${v.replace(/'/g, "''")}'`;
}

function num(v: number | null | undefined): string {
  return v == null ? "NULL" : String(v);
}

type MediaFixture = {
  id: string;
  mediaType: string;
  tmdbId: number;
  slug: string;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  seasonCount?: number | null;
  episodeCount?: number | null;
  voteAverage: number | null;
  voteCount: number | null;
  popularity: number | null;
};

type AuthFieldSchema = {
  type: string | string[];
  required: boolean;
  unique: boolean;
  index: boolean;
  references?: {
    table: string;
    field: string;
    onDelete?: string;
  };
};

type AuthTableSchema = {
  name: string;
  fields: Record<string, AuthFieldSchema>;
};

type AuthMigrationSchema = {
  tables: AuthTableSchema[];
};

function main() {
  return runSetup();
}

async function runSetup() {
  const now = Date.now();
  const { migrationSchema } = (await import(join(root, ".void/better-auth-schema.ts"))) as {
    migrationSchema: AuthMigrationSchema;
  };
  const media = JSON.parse(
    readFileSync(join(root, "db/fixtures/media.json"), "utf8"),
  ) as MediaFixture[];

  const lines = [
    ...authBootstrapStatements(migrationSchema),
    ...media.map(
      (m) =>
        `INSERT OR IGNORE INTO media (id, tmdb_id, media_type, slug, title, original_title, overview, poster_path, backdrop_path, release_date, season_count, episode_count, vote_average, vote_count, popularity, created_at, updated_at) ` +
        `VALUES (${esc(m.id)}, ${m.tmdbId}, ${esc(m.mediaType)}, ${esc(m.slug)}, ${esc(m.title)}, ${esc(m.originalTitle)}, ${esc(m.overview)}, ${esc(m.posterPath)}, ${esc(m.backdropPath)}, ${esc(m.releaseDate)}, ${num(m.seasonCount)}, ${num(m.episodeCount)}, ${num(m.voteAverage)}, ${num(m.voteCount)}, ${num(m.popularity)}, ${now}, ${now});`,
    ),
  ];

  console.log("▶ applying migrations...");
  run("vp exec void db migrate");

  const tempDir = join(root, "tmp");
  mkdirSync(tempDir, { recursive: true });
  const sqlName = `track-seed-${now}.sql`;
  const sqlFile = join(tempDir, sqlName);
  const sqlPath = `tmp/${sqlName}`;
  writeFileSync(sqlFile, lines.join("\n"));

  try {
    console.log(`▶ seeding catalog (${media.length} items)...`);
    run(`vp exec void db execute --file "${sqlPath}"`);
  } finally {
    rmSync(sqlFile, { force: true });
  }

  console.log("✓ ready");
}

function authBootstrapStatements(schema: AuthMigrationSchema): string[] {
  return schema.tables.flatMap((table) => {
    const tableStatement = createAuthTableStatement(table);
    const indexStatements = Object.entries(table.fields)
      .filter(([, field]) => field.index)
      .map(([fieldName]) => createAuthIndexStatement(table.name, fieldName));

    return [tableStatement, ...indexStatements];
  });
}

function createAuthTableStatement(table: AuthTableSchema): string {
  const columns = [
    "`id` text PRIMARY KEY NOT NULL",
    ...Object.entries(table.fields).map(([fieldName, field]) =>
      createAuthColumnStatement(fieldName, field),
    ),
  ];

  return `CREATE TABLE IF NOT EXISTS \`${table.name}\` (${columns.join(", ")});`;
}

function createAuthColumnStatement(fieldName: string, field: AuthFieldSchema): string {
  const parts = [`\`${fieldName}\``, sqliteTypeFor(field)];

  if (field.required) {
    parts.push("NOT NULL");
  }
  if (field.unique) {
    parts.push("UNIQUE");
  }
  if (field.references) {
    parts.push(
      `REFERENCES \`${field.references.table}\`(\`${field.references.field}\`) ON DELETE ${
        field.references.onDelete ?? "no action"
      } ON UPDATE no action`,
    );
  }

  return parts.join(" ");
}

function sqliteTypeFor(field: AuthFieldSchema): string {
  if (Array.isArray(field.type)) {
    return "text";
  }
  if (field.type === "boolean" || field.type === "date") {
    return "integer";
  }
  return "text";
}

function createAuthIndexStatement(tableName: string, fieldName: string): string {
  return `CREATE INDEX IF NOT EXISTS \`${tableName}_${fieldName}_idx\` ON \`${tableName}\` (\`${fieldName}\`);`;
}

main().catch((err) => {
  process.stderr.write(`setup failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
