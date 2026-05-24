# Rules

Readability

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

Toolchain and platform

- This repository uses Vite+ (`vp`) and Void.
- Use `vp` for project workflows.
- Deploy target is Void Cloud.
- Use `vp exec void deploy` for deploys.

Void CLI accuracy

- Do not guess `void` CLI command names or flags.
- Before running or suggesting `void` commands, read `node_modules/void/skills/void/docs/reference/cli.md`.

Vite+ checks

- Before finishing code changes, run `vp check`.
- If tests exist for touched behavior, run them with `vp test`.
- If setup/runtime behavior looks wrong, run `vp env doctor`.

Generated artifacts

- If `.void/*` generated types are missing/stale (fresh clone/CI/editor bootstrap), run `vp exec void prepare`.

Directory ownership

- API route handlers: `routes/`
- Page loaders and page views: `pages/`
- Schema, migrations, seed, fixtures: `db/`
- Domain/business + persistence logic: `src/domain/`
- External provider adapters: `src/integrations/`
- Cross-boundary orchestration: `src/services/`

Data constraints

- `users.role` is the role source of truth.
- Do not add RBAC tables (`roles`, `permissions`, `role_permissions`, `user_roles`) unless explicitly requested.
- Seed must use committed local fixtures.
- Seed path must not require network access.

Boundary constraints

- `routes/*`: parse/validate input, call domain/service, shape response.
- `src/domain/*`: business rules and DB operations only.
- `src/integrations/*`: external API calls and mapping only.
- `src/services/*`: orchestration only.
- Do not import framework request/response objects into domain or integration modules.
- Integrations must not write directly to DB.

Operational separation

- Keep migrate, seed, and deploy as separate operations.

Observability

- For server-side failures and warnings, emit logs via `void/log` (`logger.error|warn|info`) or `console.*`.
- Do not silently swallow boundary failures.
