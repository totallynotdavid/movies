# Development

Owner: project maintainers.

## Prerequisites

The repository pins Node and Vite+ in `mise.toml`:

```toml
[tools]
node = "26.2.0"
vp = "1.0.0"
```

Use Bun for package scripts. Vite+ is the project workflow tool.

## Local setup

Local configuration is a single `.env` file. `env.ts` defines these names:

| Variable                 | Required | Use                                                         |
| ------------------------ | -------- | ----------------------------------------------------------- |
| `BETTER_AUTH_SECRET`     | Yes      | Better Auth secret                                          |
| `TMDB_READ_ACCESS_TOKEN` | No       | Remote TMDB search, cache-on-select, and metadata hydration |
| `ADMIN_EMAIL`            | No       | Gives the matching newly created user the `admin` role      |

Create the required secret, install packages, and start the app:

```sh
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 48)" > .env
bun install
bun dev
```

The `predev` script runs `bun scripts/setup.ts`. Setup reads the generated
Better Auth schema, applies pending migrations with `vp exec void db migrate`,
and inserts the committed rows from `db/fixtures/media.json` through a temporary
SQL file. It does not need a network connection or a TMDB token. The seed path
in `db/seed.ts` also uses only committed fixtures.

## Checks and tests

Use the repository's Vite+ commands:

```sh
vp check
vp test
vp env doctor
```

`vp check` runs formatting, linting, and type checking. `vp test` runs the
JavaScript tests. Use `vp env doctor` when setup or runtime behavior looks
wrong. The package's `lint` script runs `vp lint && vp fmt --check`; its
`lint:fix` script runs `vp lint --fix && vp fmt`.

If generated `.void/*` types are missing or stale, prepare them without starting
Vite:

```sh
vp exec void prepare
```

## Database operations

Keep migration, seed, and deploy as separate operations.

```sh
bun run db:migrate
bun run db:migrate:remote
bun run db:seed
```

The package scripts run `vp exec void db migrate`, its remote form with
`--remote`, and `vp exec void db seed`. Void also provides these direct
operations:

```sh
vp exec void db generate
vp exec void db reset
vp exec void db seed
```

`db generate` creates migration SQL from schema changes. `db reset` drops and
re-applies migrations. `db seed` resets the local database, reapplies
migrations, and runs the default `db/seed.ts` file. Use the local Void CLI
reference at `node_modules/void/skills/void/docs/reference/cli.md` for flags.

## Fixture refresh

The committed fixture file is enough for local setup. To refresh it from TMDB,
put `TMDB_READ_ACCESS_TOKEN` in `.env` and run:

```sh
bun run fixtures:fetch
bun run fixtures:trending
```

The first command fetches the configured top-rated and trending movie and show
sets. The second refreshes trending rows while preserving existing items that
are outside the fetched set. Both commands write `db/fixtures/media.json` and
`db/fixtures/meta.json`.

## Deployment

The target platform is Void Cloud. The normal release applies remote migrations
and deploys:

```sh
bun run release
```

That script runs `vp check`, `vp exec void db migrate --remote`, and
`vp exec void deploy`.

Recovery is for a remote project or database that has been manually reset or
recreated:

```sh
bun run recover
```

It runs `vp exec void db migrate --remote`, `vp exec void db seed`, and
`vp exec void deploy`. Use it only when a clean remote database is intentional.

The CI deployment workflow runs `vp install`, `vp check`, and
`vp exec void deploy` with `VOID_TOKEN`. Do not put credentials in this
repository.

## Local queues and crons

Queue messages are processed by the local Void runtime. Scheduled jobs do not
fire automatically during local development. Trigger the scheduled endpoint with
a `POST` request to:

```text
/__void/scheduled
```

The reconcile job enqueues at most 50 due media rows per run and is scheduled
every 15 minutes in `crons/reconcile.ts`.

## Inspecting local data

`vp dev` uses Miniflare D1. It is not the same database as the CLI's D1. Inspect
development data under:

```text
.void/v3/d1/miniflare-D1DatabaseObject/*.sqlite
```

Stop a process listening on the default development port with:

```sh
fuser -k 5173/tcp
```

Use `python3` to query the SQLite file. The `sqlite3` CLI binary hangs in this
environment.
