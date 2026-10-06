# tracker

[![CI](https://github.com/totallynotdavid/movies/actions/workflows/ci.yml/badge.svg)](https://github.com/totallynotdavid/movies/actions/workflows/ci.yml)

tracker is a web app for people who want to record what they watch, what they
plan to watch, and what they think of movies and shows. It stores a local
catalog and personal watch data. It does not play or host media. TMDB supplies
optional catalog metadata.

It is built with Void (Cloudflare Workers + D1), Vite, Vue 3, Drizzle ORM, and
UnoCSS.

## Get started

Create `.env` with the required auth secret, install dependencies, and start the
local app:

```sh
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 48)" > .env
bun install
bun dev
```

`TMDB_READ_ACCESS_TOKEN` is optional. Set it in `.env` to enable remote title
search, cache-on-select, and metadata hydration. The development setup applies
migrations and loads the committed catalog fixtures before the server starts.
This setup does not need an API key.

## Features

- Track movies and shows in a library with status, notes, ratings, and
  favorites.
- Log movie watches and show episodes, including progress and watch history.
- Search the local catalog and, when configured, TMDB.
- Browse title metadata, cast, crew, people, and public watch activity.
- View private profiles, public profiles, activity summaries, and yearly recaps.

## Non-goals

- The app does not stream, download, or host movies or shows.
- The app does not require TMDB access for its committed local catalog.
- The app does not treat remote metadata as a replacement for user watch
  history.

## Read next

- [Manual](docs/readme.md) for local development, database, fixture, and
  deployment procedures.
- [Architecture](architecture.md) for the module map and data-flow contracts.
- [Contributing](CONTRIBUTING.md) for the contributor workflow and checks.
