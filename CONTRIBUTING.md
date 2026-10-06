# Contributing

Owner: project maintainers.

Read the [architecture](architecture.md) before changing a boundary and the
[development manual](docs/development.md) before running project commands.

## Set up

Create `.env`, install dependencies, and start the local app as described in the
[local setup guide](docs/development.md#local-setup). The setup uses committed
fixtures and does not need a TMDB token.

## Verify changes

Run the local commands from the CI check workflow:

```sh
vp install
vp exec void prepare
vp check
vp test
```

The repository has four CI workflows:

- `.github/workflows/ci.yml` runs on non-`master` pushes and pull requests
  targeting `master`. It installs dependencies, prepares Void, runs `vp check`,
  and runs `vp test`.
- Fallow (`.github/workflows/fallow.yml`) runs on pull requests targeting
  `master`. It prepares Void and runs
  `vp dlx fallow audit --format pr-comment-github --quiet`.
- `.github/workflows/codeql.yml` runs on pushes to `master` and pull requests
  targeting `master`. It runs GitHub CodeQL analysis for JavaScript.
- `.github/workflows/deploy.yml` runs on pushes to `master`. It runs
  `vp install`, `vp check`, and `vp exec void deploy`.

Format Markdown with:

```sh
bunx prettier --print-width 80 --prose-wrap always --write '**/*.md'
```

Keep behavior changes in source and document the resulting contract in the
document that owns it. Do not duplicate a rule across the README, architecture
page, manual, or agent instructions.
