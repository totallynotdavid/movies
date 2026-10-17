# Contributing

Owner: project maintainers.

Read the [architecture](architecture.md) before changing a boundary and the
[development manual](docs/development.md) before running project commands.

## Set up

Create `.env`, install dependencies, and start the local app as described in the
[local setup guide](docs/development.md#local-setup). The setup uses committed
fixtures and does not need a TMDB token.

## Verify changes

Run the commands CI runs. [mise](https://mise.jdx.dev) installs the pinned tools
and runs the tasks in `mise.toml`:

```sh
mise run install
mise run check
```

`mise run check` runs `lint`, `typecheck`, `test`, and `build`, and writes
nothing tracked. `mise run fix` applies safe lint fixes and formats every file,
Markdown included.

The repository has four CI workflows:

- `.github/workflows/ci.yml` runs on non-`master` pushes and pull requests
  targeting `master`. It runs `mise run install` and `mise run check`.
- Fallow (`.github/workflows/fallow.yml`) runs on pull requests targeting
  `master`. It runs `mise run prepare` and `mise run audit`.
- `.github/workflows/codeql.yml` runs on pushes to `master` and pull requests
  targeting `master`. It runs GitHub CodeQL analysis for JavaScript.
- `.github/workflows/deploy.yml` runs on pushes to `master`. It runs
  `mise run install`, `mise run check`, and `mise run deploy`.

Keep behavior changes in source and document the resulting contract in the
document that owns it. Do not duplicate a rule across the README, architecture
page, manual, or agent instructions.
