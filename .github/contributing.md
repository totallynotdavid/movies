# Contributing

Owner: project maintainers.

Read the [architecture](../docs/architecture.md) before changing a boundary and
the [development manual](../docs/development.md) before running project
commands.

## Set up

Create `.env`, install dependencies, and start the local app as described in the
[local setup guide](../docs/development.md#local-setup). The setup uses
committed fixtures and does not need a TMDB token.

## Verify changes

Run the commands CI runs. [mise](https://mise.jdx.dev) installs the tools that
`mise.toml` pins, and the `package.json` scripts run the checks:

```sh
mise install
bun install --frozen-lockfile
bun run check
```

`bun run check` runs `lint`, `typecheck`, `test`, and `build`, and writes
nothing tracked. `bun run fix` applies safe lint fixes and formats every file,
Markdown included.

The repository has four CI workflows:

- `.github/workflows/ci.yml` runs on non-`master` pushes and pull requests
  targeting `master`. It runs `bun install --frozen-lockfile` and
  `bun run check`.
- Fallow (`.github/workflows/fallow.yml`) runs on pull requests targeting
  `master`. It runs `bun run typegen` and `bun run audit`.
- `.github/workflows/codeql.yml` runs on pushes to `master` and pull requests
  targeting `master`. It runs GitHub CodeQL analysis for JavaScript.
- `.github/workflows/deploy.yml` runs on pushes to `master`. It runs
  `bun install --frozen-lockfile`, `bun run check`, and `bun run deploy`.

Keep behavior changes in source and document the resulting contract in the
document that owns it. Do not duplicate a rule across the README, architecture
page, manual, or agent instructions.
