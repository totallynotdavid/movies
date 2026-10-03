# tracker

[![CI](https://github.com/totallynotdavid/movies/actions/workflows/ci.yml/badge.svg)](https://github.com/totallynotdavid/movies/actions/workflows/ci.yml)

You can track what you're watching, have watched, or plan to watch, write notes,
rate titles, and mark favorites. Built with Void (Cloudflare Workers + D1) ·
Vite · Vue 3 · Drizzle ORM · UnoCSS

## Running locally

```sh
bun install
bun dev
```

Local configuration lives in a single `.env` file (see `env.ts` for the names).
Set `BETTER_AUTH_SECRET` there (`openssl rand -base64 48`).
`TMDB_READ_ACCESS_TOKEN` is optional and only needed for TMDB remote search and
cache-on-select.

Migrations and seeding run automatically before the dev server starts. The seed
pulls from committed fixtures in `db/fixtures/media.json`, so no API keys are
needed to get going.

To refresh the fixtures against TMDB (requires `TMDB_READ_ACCESS_TOKEN` in
`.env`):

```sh
bun run fixtures:fetch      # pull by IDs listed in db/fixtures/meta.json
bun run fixtures:trending   # replace with current trending titles
```

## Deploying

Normal release:

```sh
bun run release
```

Destructive recovery (after you manually reset/recreate the remote project/DB):

```sh
bun run recover
```

Use the first command for day-to-day releases. Use the recovery command only
when you intentionally need a clean remote database.
