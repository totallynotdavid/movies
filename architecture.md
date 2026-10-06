# Architecture

Owner: project maintainers.

tracker is a Vite+ and Vue application running on Void with a D1 database. A
page loader or API route is the boundary for request data. It calls a service or
read model, which calls domain modules and integrations. The UI renders the
returned view model.

## Code map

| Path                                     | Owns                                                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `routes/`                                | API route parsing, validation, service calls, and response shapes                |
| `pages/`                                 | Page loaders and page views                                                      |
| `middleware/`                            | Per-request user and role context                                                |
| `scripts/`                               | Development tooling and setup, not application runtime                           |
| `crons/`                                 | Thin scheduled triggers that call services                                       |
| `queues/`                                | Thin queue consumers that call services                                          |
| `db/`                                    | Schema, migrations, seed, and fixtures                                           |
| `src/domain/`                            | Business rules and database operations                                           |
| `src/db/`                                | Persistence kernel, with no business logic, and the Better Auth schema re-export |
| `src/read-models/`                       | Page view models and profile-visibility access rules                             |
| `src/services/`                          | Cross-boundary orchestration                                                     |
| `src/integrations/`                      | External provider calls and mapping                                              |
| `src/components/` and `src/composables/` | Client UI and client-side behavior                                               |
| `src/styles/`                            | Theme tokens, base element styles, and fonts                                     |
| `src/shared/`                            | Isomorphic code safe in any bundle                                               |
| `src/types/`                             | Ambient type augmentation and module declarations                                |
| `src/result.ts`                          | Shared `Result` type and the `attempt` wrapper for throwing async boundaries     |

`src/shared/` must not import `void/db`, Drizzle, or domain modules. Domain and
integration modules do not import framework request or response objects.
Integrations do not write directly to the database.

Server-side failures and warnings are logged through `void/log` (`logger.error`,
`logger.warn`, or `logger.info`) or `console.*`. Boundary failures are not
silently swallowed.

## Request flow

Routes parse and validate input, call a domain or service function, and shape
the response. Domain modules own business rules and database operations.
Services compose multiple boundaries. Read models compose domain queries for a
page and enforce profile visibility. Page loaders use those results to render
Vue views.

The `@/*` alias points to `src/` in both `tsconfig.json` and `vite.config.ts`.
Use it for cross-directory imports such as `@/domain/user`; use relative imports
only for siblings inside `src/`. `db/` may use `./fixtures`, and
`scripts/fetch-metadata.ts` may import fixture types from
`../db/fixtures/types`. Generated `src/db/auth-schema.ts` is the exception
because it re-exports `../../.void/better-auth-schema`. Use Void's `@schema`
alias for `db/schema.ts`.

Keep the two alias definitions in sync. Manage the generated `files` and `paths`
entries with `vp exec void init --tsconfig`; hand-edit only the application's
`@/*` entry.

## Identity and user data

Better Auth owns the `user` table. There is no application `users` table. The
username plugin and user additional fields carry `username`, `role`,
`ratingSystem`, `timeZone`, `visibility`, `avatarEmoji`, and `avatarColor`. Read
these values through `src/domain/user.ts`; user-settable writes go through the
auth client.

`user.role` is an additional field with `input: false`. The create hook in
`auth.ts` assigns `admin` when the new user's email matches `ADMIN_EMAIL`; all
other users receive `member`. The auth client cannot set the role. Anonymous,
member, and admin are the application roles exposed by `src/domain/user.ts` and
`middleware/01.auth-role.ts`.

The database has catalog tables for media, people, credits, genres, companies,
localized titles, and episodes. User data is in `library_entries`,
`watch_events`, `favorite_media`, and `favorite_people` in `db/schema.ts`. Watch
events are an immutable log. Displayed library status and recency are derived
from that log and the user-filed status. Movies use a null episode identity;
shows use season and episode identity.

Do not add RBAC tables (`roles`, `permissions`, `role_permissions`, or
`user_roles`) unless the feature explicitly requires them. Seed data uses
committed local fixtures and never needs network access.

## TMDB boundary

Application runtime code has one TMDB client at
[`src/integrations/tmdb/client.ts`](src/integrations/tmdb/client.ts). Its base
URL is `TMDB_BASE`; only `TMDB_READ_ACCESS_TOKEN` comes from `void/env`. The
fixture tool at [`scripts/fetch-metadata.ts`](scripts/fetch-metadata.ts) is the
one development-tooling exception and has its own `fetch`.

The integration is an anti-corruption boundary. The parser at
`src/integrations/tmdb/parse.ts` and the TMDB mapper modules own
upstream-to-domain mapping. Valibot projection schemas map or reject upstream
data. `looseArray` keeps valid rows and drops invalid rows; required fields
reject a row. The domain never receives invalid TMDB rows. The detail, person,
search, and season adapters live under `src/integrations/tmdb/`.

## Hydration

Hydration freshness is derived from each track's `*HydratedAt` timestamp and
`*Error` string. It is not a stored enum. The possible states are stub, fresh,
stale, and failed. The rules are implemented in
[`src/domain/hydration.ts`](src/domain/hydration.ts).

Media hydration has three tiers:

1. Tier 1 runs from the media loader when it sees a bare stub. It writes detail
   scalars, full crew, full movie cast, and TV cast capped to the top 100 credit
   rows by episode count. The cap is `TV_CAST_LIMIT` in
   `src/integrations/tmdb/media-detail.ts`.
2. Tier 2 fans out season episode runtime work through
   `queues/media-hydration.ts`.
3. Tier 3 per-episode guest-star credit graphs are lazy and demand-gated on
   favorited people. They are not an eager catalog sweep. The current code does
   not implement Tier 3; its future UI must remain additive to Tiers 1 and 2.

Media loaders block only on a bare stub. The queue handles background hydration.
[`crons/reconcile.ts`](crons/reconcile.ts) runs every 15 minutes and enqueues a
bounded stale, failed, or unhydrated backlog. Refreshing is not done per page
view.

Media operations return a `HydrationOutcome` and do not throw into a loader.
TMDB fetch failures are recorded in `*Error` columns. A failed `runBatch`
persistence write returns `persistence_failed` without recording a new failure,
so the row keeps its previous freshness state. A missing media row is treated as
a skipped queue message.

Person pages are the exception. `src/services/person-hydration.ts` calls TMDB on
every view because filmography is not persisted. It persists only bio scalars. A
TMDB failure is recorded durably, logging instead of throwing if that recording
fails. A failed bio write is logged. The loader receives a `PersonView` with an
empty filmography on failure rather than an outcome.

## Persistence kernel

In application runtime code under `src/`, every bulk insert and every user-sized
`inArray` goes through `insertChunks`, `selectByIds`, or `runBatch` in
[`src/db/kernel.ts`](src/db/kernel.ts). Chunk size is derived from the
bound-column count of the row, so adding a column cannot silently breach the D1
parameter cap. `runBatch` uses one atomic `db.batch()` to commit data and its
freshness marker together. No bulk write in `src/` bypasses the kernel. The
exception is `db/seed.ts`, which bulk-inserts catalog fixtures with a plain
`insert`.

List DTOs carry stable IDs or keys. Templates do not key reorderable,
insertable, or deletable lists by index. The seven-day heatmap week in
`src/components/profile/ProfileActivityHeatmap.vue` is a fixed-length static row
and may key by index.

The D1 limits used by the kernel are 100 bound parameters per statement, 100 KB
per statement, and 2 MB per row. The 30-second limit applies to a whole
`db.batch()` call. There is no documented per-batch statement-count cap.
`BatchItem` comes from `drizzle-orm/batch`. Bound parameters are the keys passed
to `.values({})`; omitted keys become literals, while a passed `null` is still
bound. `db.batch()` is one atomic transaction.

## Credits and external-load constraints

TMDB `aggregate_credits` is per character, not per person. Grey's Anatomy
measured about 3,200 cast rows, including about 2,600 one-episode guests; voice
and sketch shows can contain about ten rows per person. The Tier 1 cap is
therefore per credit row, not per person. A measured uncapped batch was about
726 statements; the row-capped batches were at most about 120: Grey's 84,
Simpsons 87, GoT 106, and SNL 119.

TMDB per-episode credits expose `guest_stars`, but cost about one API call per
episode. Grey's Anatomy would require about 450 calls. That is why Tier 3 is
lazy and demand-gated, never eager.

## Queues, crons, and views

Queues are `defineQueue<T>` modules under `queues/`. Void's `maxRetries` default
is 3, so a consumer that retries to another number exports that number as
`maxRetries`; this consumer exports 5 in `queues/media-hydration.ts`.

Crons are `defineScheduled` modules under `crons/` with an exported `cron`
expression. Local development does not auto-fire them. Trigger the scheduled
endpoint with `POST /__void/scheduled` when testing a cron locally.

The title page reads public episode data and per-user watch marks separately.
Profile reads go through `src/read-models/viewable-profile.ts`, so a private
profile is visible only to its owner. `profilePage` loads the profile owner's
settings for both private and public profiles. The public `ProfileCard` receives
that `ratingSystem` and uses it to format the displayed average score. As a
result, a public viewer can infer the profile owner's selected rating system
from the formatted score. The code does not omit this value from the public
projection.
