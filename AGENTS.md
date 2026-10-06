# Rules

Owner: project maintainers.

This file contains rules for agents working in this repository. The user
documentation owns the explanation of the system and its operational procedures:

- [Architecture](architecture.md) owns module boundaries, data ownership,
  hydration, persistence, and verified runtime constraints.
- [Development manual](docs/development.md) owns setup, commands, database,
  fixtures, deployment, and local troubleshooting.
- [Contributing](CONTRIBUTING.md) owns the contributor workflow and checks.

## Readability

- Keep functions small, linear, and single-purpose.
- Use early returns to keep happy paths visible and indentation shallow.
- Avoid boolean mode arguments; split behavior into separate functions.
- Use one consistent domain term per concept across modules and APIs.
- Avoid generic names (`helper`, `util`, `manager`, `processor`) unless literal.
- Remove dead code, commented-out code, and ceremony without active value.
- Do not abstract coincidental similarity that has no shared reason to change.
- Keep side effects explicit and close to boundaries.
- Keep domain modules locally understandable without framework context.
- Validate at boundaries and return explicit errors with actionable context.
- Comments are allowed only for non-obvious intent or external API quirks.
- Long comments are welcome when they record why, a measured result, a rejected
  alternative, or an external quirk. Cut comments that only restate the code.

## Working approach

- Be pragmatic about the architecture, not about the diff. "Pragmatic" means the
  shape that is right for the long term, not "keep the debt to stay small."
- Breaking changes are encouraged when they buy long-term clarity. The DB is
  disposable and can be reset or reseeded freely. There is no backfill or
  compatibility-shim burden.
- Verify, do not guess. Confirm limits and payload shapes against the real
  source (TMDB, Void, D1) before designing around them. A throwaway probe script
  beats an assumption. See the verified facts in the architecture page.
- Give each cross-cutting invariant one owner (a seam) instead of re-checking it
  at every call site.

## Tooling

- This repository uses Vite+ (`vp`) and Void. Use `vp` for project workflows.
- The deploy target is Void Cloud. Use `vp exec void deploy` for deploys.
- Do not guess `void` CLI command names or flags.
- Before running or suggesting a `void` command, read
  `node_modules/void/skills/void/docs/reference/cli.md`.
- Before finishing code changes, run `vp check`. If tests exist for touched
  behavior, run them with `vp test`. If setup or runtime behavior looks wrong,
  run `vp env doctor`.
- If `.void/*` generated types are missing or stale in a fresh clone, CI, or the
  editor bootstrap, run `vp exec void prepare`.

## Scope

Do not change credentials or login setup. Keep comments direct, concrete, and
behavior-focused. Comments should explain non-obvious intent, invariants, edge
cases, or boundary contracts. Use doc comments for exported APIs when the
contract is subtle. Do not repeat obvious code structure, cross-module rationale
already in the architecture page, or the documentation workflow. Prefer plain
sentences with periods, commas, and brackets. Avoid em dashes. Do not use
comments to duplicate the architecture or development manual.
