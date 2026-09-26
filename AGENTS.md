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
- Long comments are welcome when they record _why_, a measured result, a
  rejected alternative, or an external quirk. Cut comments that only restate
  the code.

Working approach

- Be pragmatic about the architecture, not about the diff. "Pragmatic" means the
  shape that is right for the long term, not "keep the debt to stay small."
- Breaking changes are encouraged when they buy long-term clarity. The DB is
  disposable and can be reset or reseeded freely. There is no backfill or
  compatibility-shim burden.
- Verify, don't guess. Confirm limits and payload shapes against the real source
  (TMDB, Void, D1) before designing around them. A throwaway probe script beats
  an assumption. See "Verified facts" below for confirmed limits and behavior.
- Give each cross-cutting invariant one owner (a "seam") instead of re-checking it
  at every call site.

Toolchain and platform

- This repository uses Vite+ (`vp`) and Void.
- Use `vp` for project workflows.
- Deploy target is Void Cloud.
- Use `vp exec void deploy` for deploys.

Void CLI accuracy

- Do not guess `void` CLI command names or flags.
- Before running or suggesting `void` commands, read
  `node_modules/void/skills/void/docs/reference/cli.md`.

Vite+ checks

- Before finishing code changes, run `vp check`.
- If tests exist for touched behavior, run them with `vp test`.
- If setup/runtime behavior looks wrong, run `vp env doctor`.

Generated artifacts

- If `.void/*` generated types are missing/stale (fresh clone/CI/editor
  bootstrap), run `vp exec void prepare`.

Directory ownership

- API route handlers: `routes/`
- Page loaders and page views: `pages/`
- Request middleware (per-request user and role context): `middleware/`
- Dev tooling and setup scripts, not app runtime: `scripts/`
- Scheduled jobs (thin triggers → services): `crons/`
- Queue consumers (thin triggers → services): `queues/`
- Schema, migrations, seed, fixtures: `db/`
- Domain/business + persistence logic: `src/domain/`
- Persistence kernel (chunk/batch primitives; no business logic) and the Better
  Auth schema re-export: `src/db/`
- Page view models (compose domain queries and profile-visibility access rules for
  loaders): `src/read-models/`
- Shared `Result` type and the `attempt` wrapper for throwing async boundaries:
  `src/result.ts`
- Global stylesheet (theme tokens, base element styles, fonts): `src/styles/`
- External provider adapters: `src/integrations/`
- Cross-boundary orchestration: `src/services/`
- Client UI (Vue components, composables): `src/components/`, `src/composables/`
- Isomorphic, server-free code (pure types, schemas, helpers safe in any bundle):
  `src/shared/`. Must not import `void/db`, drizzle, or domain modules.
- Ambient type augmentation (Void context, module declarations): `src/types/`

Import paths

- Use the `@/*` alias for any cross-directory import into `src/`, for example
  `@/domain/user` or `@/shared/types/identity`. Within `src/`, relative imports
  (`./x`) are for same-directory siblings only. Do not use `../../..` chains.
  Outside `src/`, `db/` may use `./fixtures`, and `scripts/fetch-metadata.ts`
  may import `../db/fixtures/types`. Generated files are the exception: the
  `src/db/auth-schema.ts` re-export, written by `vp exec void prepare`, imports
  `../../.void/better-auth-schema`. Use Void's `@schema` alias for `db/schema.ts`.
- The alias lives in `tsconfig.json` (`compilerOptions.paths`) and `vite.config.ts`
  (`resolve.alias`) and must stay in sync. Manage the tsconfig with
  `vp exec void init --tsconfig`. That command merges Void's generated
  `files` and `paths`. Hand-edit only the app `@/*` entry.

Data constraints

- The user record is Better Auth's `user` table (not an app `users` table). The
  username plugin + additionalFields carry username, role, ratingSystem, timeZone,
  visibility, avatarEmoji, and avatarColor. Read it only through
  `src/domain/user.ts`; user-settable writes go through the auth client.
- `user.role` (a Better Auth additionalField, `input:false`) is the role source of
  truth, set server-side only (the create hook), never via the auth client.
- Do not add RBAC tables (`roles`, `permissions`, `role_permissions`,
  `user_roles`) unless explicitly requested.
- Seed must use committed local fixtures.
- Seed path must not require network access.

Boundary constraints

- `routes/*`: parse/validate input, call domain/service, shape response.
- `src/domain/*`: business rules and DB operations only.
- `src/integrations/*`: external API calls and mapping only.
- `src/services/*`: orchestration only.
- Do not import framework request/response objects into domain or integration
  modules.
- Integrations must not write directly to DB.

Operational separation

- Keep migrate, seed, and deploy as separate operations.

Observability

- For server-side failures and warnings, emit logs via `void/log`
  (`logger.error|warn|info`) or `console.*`.
- Do not silently swallow boundary failures.

Architecture

Rich-metadata ingestion flows through five single-owner seams; the directory
ownership and boundary constraints above are what enforce them.

1. One TMDB client (`src/integrations/tmdb/client.ts`), the only TMDB `fetch` in
   app runtime code (`src/`). The base URL is the `TMDB_BASE` constant in that
   file; only the token comes from `void/env`. The one exception is the
   dev-tooling script `scripts/fetch-metadata.ts`, which has its own `fetch`.
2. Anti-corruption parsing (`src/integrations/tmdb/parse.ts` + mappers), valibot
   map-or-reject. `looseArray` keeps good rows and drops bad ones; required fields
   reject the row. The domain never sees invalid TMDB data.
3. Hydration operation + state (`src/services/media-hydration.ts`,
   `src/domain/hydration.ts`), freshness is _derived_ from `*HydratedAt` +
   `*Error` columns (stub / fresh / stale / failed), not a stored enum. Media
   operations return a `HydrationOutcome` and never throw into a loader. Only TMDB
   fetch failures are recorded durably (`*Error` columns); a failed `runBatch`
   persistence write returns `persistence_failed` without recording anything, so
   the row keeps its previous freshness state. Person pages are the exception:
   `src/services/person-hydration.ts` calls TMDB on every view because the
   filmography is not persisted, persists only the bio scalars, logs a failed
   persist, and returns a `PersonView` instead of an outcome.
4. Persistence kernel (`src/db/kernel.ts`), in app runtime code (`src/`) every
   bulk insert and every user-sized `inArray` routes through `insertChunks` /
   `selectByIds` / `runBatch`. Chunk size derives from the row's bound-column
   count, so adding a column cannot breach the D1 cap. One atomic `db.batch()`
   commits data + freshness marker together. No bulk write in `src/` may bypass
   the kernel. The one exception is `db/seed.ts`, which bulk-inserts the catalog
   fixtures with a plain `insert`.
5. View identity, list DTOs carry stable ids/keys; templates never key on index
   for lists that can reorder, insert, or delete. A fixed-length static row (the
   seven days of a heatmap week in `ProfileActivityHeatmap.vue`) may key on its
   index.

Credits are three tiers. Their size and value differ sharply, so do not merge
them into one "complete credits" write:

- Tier 1, show-level (loader, sync-on-stub): full crew + full movie cast + TV
  cast capped to the top-100 credit _rows_ by episode count (`TV_CAST_LIMIT`).
  This bounds the hydration batch by construction.
- Tier 2, episode runtimes: queue fan-out.
- Tier 3, per-episode credit graph (guest stars): lazy and demand-gated on
  favorited people; never an eager catalog sweep. Build later; keep its UI
  additive so it slots in without touching Tiers 1–2.

Trigger model (media titles): loaders read and block only on a bare stub. The
queue runs background hydration. The reconcile cron (`crons/reconcile.ts`) drains
the stale/failed/un-hydrated backlog off the request path. Refreshing is never
done per page view. Person pages do not follow this model (see seam 3).

Verified facts (don't re-derive without reason)

- D1: max 100 bound params **per statement** (not per batch), 100 KB/statement,
  and a 2 MB row. The 30 s limit applies to a whole `db.batch()` call. There is
  **no** documented per-batch statement-count cap. `db.batch()` is one atomic
  transaction. `BatchItem` imports from `drizzle-orm/batch`. "Bound params" are
  the keys passed to `.values({})`. Omitted keys emit literals. A passed `null`
  is still bound.
- TMDB: a long show's `aggregate_credits` is per-character and dominated by
  single-episode guests (Grey's ~3,200 cast, ~2,600 one-off); voice/sketch shows
  hold ~10 rows per person, so the Tier-1 cap must be per-row, not per-person.
  Measured batch: uncapped ~726 statements; row-capped ≤~120 (Grey's 84 /
  Simpsons 87 / GoT 106 / SNL 119).
- TMDB: per-episode credits (`/tv/{id}/season/{n}/episode/{e}/credits`) do expose
  `guest_stars`, but cost ~1 API call per episode (Grey's ~450), hence Tier-3 is
  lazy/demand-gated, never eager.
- Void: queues are `defineQueue<T>` in `queues/**`; `maxRetries` **defaults to 3**,
  so a consumer that retries to N must `export const maxRetries = N`. Crons are
  `crons/**` with `export const cron` + `defineScheduled`; local dev does **not**
  auto-fire, trigger via `POST /__void/scheduled`. Migrations:
  `vp exec void db generate | reset | seed`; artifacts via `vp exec void prepare`.
- Dev: `vp dev` Miniflare D1 ≠ the CLI's D1, inspect dev data at
  `.void/v3/d1/miniflare-D1DatabaseObject/*.sqlite`. Stop dev with
  `fuser -k 5173/tcp`. Query sqlite with python3; the `sqlite3` CLI binary hangs.

## Comment style guide

Write comments for future maintainers with operational intent.

Keep comments:

- Direct, concrete, and behavior-focused.
- Close to the logic they explain.
- Focused on non-obvious decisions, invariants, edge cases, and boundary contracts.

Avoid comments that:

- Repeat obvious code structure (`Header`, `Info`, `Poster`).
- Repeat cross-module rationale already documented here.
- Use meta narrative about the writing process.

Style constraints:

- Prefer plain sentences with periods, commas, parentheses, and brackets.
- Avoid em dashes.
- Use doc comments for exported APIs when the contract is subtle.
