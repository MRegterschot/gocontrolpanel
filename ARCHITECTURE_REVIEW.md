# Architecture Review — GoControlPanel

**Date:** 2026-08-25 · **Branch:** `dev` · **Version:** 0.11.2-beta
**Scope:** ~91k lines of TS/TSX, Next.js 16 + React 19, Prisma 6 (MySQL *and* Postgres), NextAuth v4, next-ws, Redis, Hetzner/SSH provisioning, in-process GBX (Trackmania XML-RPC) clients and a plugin runtime.

This review looks at *how the chosen frameworks are used*, not at feature gaps. Findings are grouped by technology and ordered roughly by impact within each group.

---

## 0. Executive summary

The project is coherent and surprisingly disciplined for its size: a consistent `doServerAction*` wrapper, a real permission model, structured logging with Sentry, and a genuine plugin architecture. The main architectural problems are not *missing structure* — they are **four load-bearing decisions that are now costing more than they give**:

| # | Decision | Consequence |
|---|---|---|
| 1 | **Server Actions used as the general-purpose data API** (185 call sites, incl. paginated table reads and 1 GB uploads) | No caching, no revalidation, serialized POSTs, unvalidated input, waterfalls |
| 2 | **Two hand-maintained Prisma schemas** (`mysql/` + `postgres/`, 120 migrations) | Type divergence (`Json` vs `String[]`), `getList<T>(any)` escape hatches, doubled migration work |
| 3 | **All live state in `globalThis` singletons** (GBX clients, file managers, live info) | The app is hard-pinned to a single instance; Redis is present but never used for pub/sub |
| 4 | **Zero automated tests**, CI only runs `next build` | Every refactor below is riskier than it needs to be |

Fixing #4 first is what makes #1–#3 safe to attempt.

---

## 1. Next.js 16 / React 19 usage

### 1.1 Server Actions are being used as a REST API — this is the biggest one

`doServerActionWithAuth` is called from **185 sites**, and many of them are *reads* invoked from client components:

```tsx
// src/app/(gocontroller)/admin/servers/page.tsx
<PaginationTable fetchData={getServersPaginated} ... />
```

```ts
// src/hooks/use-pagination-api.ts
useEffect(() => { fetchDataFromAPI(); }, [pagination.pageIndex, ...]);
```

Why this hurts:

- **Server Actions are always POST and are serialized by React** — two tables on one page cannot fetch in parallel. They are also excluded from every Next.js caching layer.
- **`revalidatePath` / `revalidateTag` / `unstable_cache` appear 0 times in the codebase.** There is effectively no server-side caching strategy; freshness is achieved by refetching from `useEffect` everywhere.
- **Every exported `"use server"` function is a public, unauthenticated-until-checked HTTP endpoint.** Their arguments are attacker-controlled (see §3.1).
- The RSC model is bypassed: 195 of 287 `.tsx` files are `"use client"`. Pages fetch permissions on the server, then hand a client component a function to call back into the server.

**Recommendation**

- Keep Server Actions for **mutations only** (that is what they are for).
- Move list/detail **reads** to Route Handlers (`app/api/...`) or to RSC with `fetch`/`unstable_cache` tags, and put **TanStack Query** in front of the client-side ones. TanStack Table is already a dependency; TanStack Query is the natural partner and removes `use-pagination-api.ts` entirely (caching, dedup, retry, `isLoading`, stale-while-revalidate for free).
- After mutations, call `revalidateTag("servers")` instead of manual `refetch()` chains.

### 1.2 No `middleware.ts` — authorization is re-implemented per page

There is no middleware file. Every page repeats:

```tsx
const canView = await hasPermission(routePermissions.admin.servers.view);
if (!canView) redirect(routes.dashboard);
```

`routePermissions` (`src/routes/index.ts`, 417 lines) is a good central table — but it is only consulted by pages. Server Actions hard-code their own permission strings (`"servers::moderator"` × 14, `"hetzner:servers:create"` × 13, …), so **page-level and action-level authorization can silently diverge**.

**Recommendation** — add `middleware.ts` for coarse route gating (authenticated + route permission from the existing `routePermissions` map), and have actions import from that same table rather than repeating literals.

### 1.3 A Node logger is bundled into the browser

13 files under `components/`, `hooks/`, `providers/` import `@/lib/logger` (pino). pino has a browser shim, but it ships weight into the client bundle and the logs go nowhere. `src/hooks/use-pagination-api.ts` and `src/providers/notification-provider.tsx` are both client-side.

**Recommendation** — split `lib/logger.ts` (server, pino + `"server-only"`) from a trivial client logger, or just drop client logging in favour of Sentry's browser SDK, which is already installed.

### 1.4 `serverActions.bodySizeLimit: "1gb"`

`next.config.ts` raises the Server Action body limit to 1 GB so that map/file uploads can be proxied through `uploadFiles` (`src/actions/filemanager/index.ts:243`) into a `FormData` and re-`fetch`ed to the file-manager sidecar. That buffers a gigabyte in the Node heap per upload.

**Recommendation** — upload directly from the browser to the file-manager service with a short-lived signed URL/token minted by an action, or stream through a Route Handler (`request.body` as a `ReadableStream`) instead of a Server Action. Then drop the limit back to a sane value.

### 1.5 `next-ws` monkey-patches Next internals

`"prepare": "next-ws patch"` rewrites files inside `node_modules/next`. `src/server.ts` is the dev entrypoint, but production runs `.next/standalone/server.js`, so the WebSocket wiring depends entirely on the patch surviving each Next.js upgrade. On Next **16** this is a standing upgrade hazard.

**Recommendation** — plan an exit: run the WebSocket layer as a small separate `ws`/uWebSockets process (it already only needs Redis + Prisma + the GBX managers), or move to SSE for the one-way feeds (`live`, `map`, `players`, `notifications`, `servers` are all server→client only). SSE needs no patching, reconnects natively, and works behind ordinary HTTP infrastructure. That also unblocks §4.

---

## 2. Prisma: the dual-schema problem

`src/lib/prisma/mysql/schema.prisma` and `postgres/schema.prisma` are **two 338-line files kept in sync by hand**, with **62 and 58 migration folders** respectively (most named `init`). `$DB` selects one at generate time.

They have already drifted in *type*, not just syntax:

```prisma
# mysql                          # postgres
permissions   Json  @default("[]")   permissions   String[] @default([])
checkpoints   Json  @default("[]")   checkpoints   Int[]    @default([])
apiTokens     Json                   apiTokens     String[]
serversOrder  String? @db.LongText   serversOrder  String?  @db.Text
```

The application layer papers over this with:

```ts
// src/lib/utils.ts:174
export function getList<T>(list: any): T[] { ... }
```

So the generated Prisma types — the single biggest reason to use Prisma — are **not trustworthy for these columns**, and every consumer has to launder them through an `any`.

**Recommendation (highest structural value after tests)**

1. **Pick one database.** Postgres is the better fit here (native arrays, `jsonb`, `LISTEN/NOTIFY`). Ship MySQL users a migration path; the project is still `0.x-beta`, which is exactly when to do this.
2. If dual support must stay: **generate** both schemas from one source (a `schema.base.prisma` + a small codegen step) rather than maintaining two, and **normalize the divergent columns to relations** (`UserPermission`, `Checkpoint`, `ApiToken` tables) so both dialects produce identical TypeScript types and `getList` disappears.
3. Stop naming every migration `init` — the migration history is currently unreadable.

### 2.1 No data-access layer

`src/actions/database/*.ts` mixes four concerns in one function: authorization, Prisma query construction, audit logging, and cache invalidation. `getServersPaginated` (`src/actions/database/servers.ts:78`) is representative — permission strings, `where` construction, count + findMany, and role-based scoping all inline.

**Recommendation** — extract a thin repository layer (`src/lib/db/servers.ts`) holding the Prisma queries and the visibility scoping. Actions then read: check permission → call repository → audit → revalidate. This is what makes the queries testable without a running Next.js.

### 2.2 Pagination is `count` + `findMany` on every keystroke

Every paginated read issues two round-trips, and the filter path (`name: { contains: filter }`) is unindexed. With `useEffect`-driven fetching there is also no debounce on `filter`.

**Recommendation** — debounce the filter client-side, add indexes for the filtered/sorted columns, and consider cursor pagination for the large tables (records, audit logs).

---

## 3. Validation and type safety

### 3.1 Zod is used on the client and *never* on the server

`zod` is imported in **46 files — 0 of them under `src/actions/`.** Every schema (`add-group-schema.ts`, `edit-group-schema.ts`, …) validates the form, then the *unvalidated* raw object is passed to a Server Action, which passes it to Prisma.

Since Server Actions are public POST endpoints, **form validation is not validation**. An attacker calls the action directly with any payload.

**Recommendation** — validate at the action boundary. A tiny wrapper keeps it ergonomic:

```ts
export function action<S extends z.ZodType, R>(
  schema: S,
  permissions: string[],
  fn: (input: z.infer<S>, session: Session) => Promise<R>,
) {
  return (raw: unknown) =>
    doServerActionWithAuth(permissions, (s) => fn(schema.parse(raw), s));
}
```

Move the schemas out of `src/forms/` into a shared `src/schemas/` so both the form and the action use *the same* schema — which also collapses the `add-*-schema.ts` / `edit-*-schema.ts` duplication (see §7.1).

### 3.2 `ServerResponse<T>` lies to the type system

```ts
export interface ServerResponse<T = void> { data: T; error?: string }
// ...and on the error path:
return { data: undefined as T, error: getErrorMessage(error) };
```

`data` is typed as always present but is `undefined` whenever `error` is set. Callers that destructure before checking `error` crash — and one already does:

```ts
// src/hooks/use-pagination-api.ts:36 — TypeError when the action fails
const { data: { data: fetchedData, totalCount: fetchedTotalCount }, error } = await fetchData(...);
```

**Recommendation** — make it a discriminated union so TypeScript forces the check:

```ts
export type ServerResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };
```

### 3.3 Raw error messages are returned to the browser

`getErrorMessage` (`src/lib/utils.ts:30`) returns `error.message` for *any* `Error`. A Prisma failure, an SSH failure, or an XML-RPC fault is forwarded verbatim to the client, potentially exposing schema, host, or query detail.

**Recommendation** — return a stable `code` plus a safe message for known `ServerError`s; map everything else to a generic message and keep the detail in pino/Sentry (which already receive it).

### 3.4 `strict: true` is on, but escape hatches are open

`@typescript-eslint/no-explicit-any` is disabled globally and `react-hooks/exhaustive-deps` is `"off"`; `rules-of-hooks` is only `"warn"`. 25 `any` annotations remain outside generated code, plus every WebSocket payload (`onMessage: (type: string, data: any)`).

**Recommendation** — re-enable `no-explicit-any` as a warning and ratchet it down; make `rules-of-hooks` an error (it catches real bugs, unlike `exhaustive-deps`); type the WebSocket protocol (§4.2).

---

## 4. Realtime layer

### 4.1 In-memory state pins the app to one instance

```ts
// src/lib/global.ts
type GlobalState = {
  prisma?: PrismaClient; redis?: Redis;
  gbxClients?: Record<string, GbxClientManager>;
  fileManagers?: Record<string, FileManager>;
};
```

`GbxClientManager` (1,585 lines) holds the live match state, the active player list, reconnect timers, and the plugin runtime **in process memory**. WebSocket routes attach listeners straight to that object. Consequences:

- **No horizontal scaling and no rolling deploys** — a second replica opens a *second* XML-RPC connection per game server and serves divergent state.
- **A restart drops all live match state** (`currentMatchId`, `roundNumber`, active round) with no snapshot.
- Redis is used for caching and rate limiting only — **`publish`/`subscribe` appear nowhere.**

**Recommendation** — separate the roles explicitly:

1. A **single "GBX worker"** process owns the XML-RPC connections and the plugin runtime (this part genuinely must be a singleton per game server).
2. It publishes events to **Redis pub/sub**; web instances subscribe and fan out to WebSocket/SSE clients. Web instances then become stateless and scalable.
3. Persist live-match checkpoints (Redis hash keyed by server id) so a worker restart resumes instead of resetting.

This is the change that turns the deployment from "one box, hope it stays up" into something you can restart during a race.

### 4.2 WebSocket client is hand-rolled and fragile

`src/hooks/use-websocket.ts`: no reconnect/backoff, no heartbeat, no message typing, `JSON.parse` without a try/catch, and `useCallback(onMessage, [])` freezes the first closure — stale props/state are a live hazard for any handler that reads component state.

Server-side, each route re-implements the same shape by hand (`client.send(JSON.stringify({ type, data }))`).

**Recommendation** — define the protocol once as a discriminated union (a zod schema gives you runtime validation *and* the TS type), share it between `src/app/api/ws/*` and the hook, and add reconnect-with-backoff + a ping/pong. Or adopt SSE per §1.5 and delete most of this.

### 4.3 Authorization duplicated in every WS route

Each route re-derives visibility:

```ts
const canView = token.admin || token.servers.some(...) || token.groups.some(...);
```

That logic already exists in `hasPermissionsJWTSync`. **Recommendation** — one `assertCanViewServer(token, id)` helper used by both actions and WS routes.

---

## 5. Authentication and authorization

### 5.1 `hasPermissionsJWTSync` mutates the session it is given

```ts
// src/lib/utils.ts:332
const userPermissions = jwt.permissions;       // <- same array reference
jwt.groups.forEach((group) => {
  userPermissions.push(`groups::${role}`);     // <- mutates the session object
  ...
});
```

Derived permissions are **pushed into the caller's array** on every check. If a session object is ever reused across checks in one request (and `withAuth` → `hasPermission` → `auth()` is called on every one of the 185 action call sites), the array grows on each call. It is also pure recomputation on every check.

**Recommendation** — build a fresh `Set` from `jwt.permissions` plus the derived entries, return a memoized matcher, and never touch the input. This is a small, high-value fix.

### 5.2 The JWT is a fat, stale cache of the database

`jwt()` in `src/lib/auth.ts` loads the user, **all** groups (`getAllGroupsWithServersAndMembers()` for admins), all public groups, all projects and all servers, then serializes the whole graph into the cookie. With `maxAge: 1 day` / `updateAge: 6 hours`, a permission revocation takes up to six hours to take effect, and the cookie grows linearly with the number of groups/servers — 4 KB is the practical browser limit.

**Recommendation** — keep the JWT minimal (`id`, `accountId`, `admin`), and resolve permissions server-side per request with a short-TTL Redis cache keyed by user id, invalidated on group/role writes. Bounded cookie, instant revocation.

### 5.3 NextAuth v4 on Next 16

`next-auth@4` is in maintenance; Auth.js v5 (`next-auth@5`) is the App-Router-native version with a much simpler `auth()` API and first-class middleware support (which §1.2 wants anyway). The custom Nadeo OAuth provider is ~90 lines and ports over almost unchanged.

**Recommendation** — schedule the v5 migration alongside the middleware work.

### 5.4 Permission strings are stringly-typed and scattered

`ROLES.md` lists 23 permissions in a markdown file; `routePermissions` holds the route-level ones; actions hard-code literals. Nothing type-checks a typo — `"servers:moderator"` (one colon) silently denies forever.

**Recommendation** — one `src/lib/permissions.ts` exporting a `const` object + a `Permission` union type; derive `ROLES.md` from it.

---

## 6. Long-running work has no home

`src/actions/hetzner/server-setup.ts` (985 lines) provisions cloud infrastructure **inside a Server Action**: create Hetzner server → poll with `await sleep(1000)` → open an SSH connection → execute setup scripts → write DB rows → audit.

If the browser tab closes, the deploy times out, or the process restarts mid-flight, there is **no retry, no resumption, and no record of the partial state** — but real cloud resources have been created and are being billed.

**Recommendation** — introduce a job queue. Redis and `ioredis` are already dependencies, so **BullMQ** is a near-zero-friction addition:

- The action enqueues `provision-server` and returns a job id immediately.
- A worker executes the steps idempotently, with retries and a persisted state machine.
- The UI subscribes to job progress over the existing realtime channel.

The same queue then covers map imports, TMX downloads, and record recomputation.

---

## 7. Frontend structure

### 7.1 `add-*` / `edit-*` form pairs are copy-paste twins

17 `add-*` and 10 `edit-*` form files. `add-group-form.tsx` (220 lines) and `edit-group-form.tsx` (230 lines) differ only in defaults and the submit call; their zod schemas differ by three optional fields.

**Recommendation** — one `<GroupForm mode="create" | "edit" defaultValues={...} onSubmit={...} />` per entity, with one schema (`.partial()` or an `.extend()` for the edit case). This removes on the order of 2,000 lines of duplicated JSX and, more importantly, removes the class of bug where a field is fixed in `edit` but not `add`.

### 7.2 `src/lib/utils.ts` is a 542-line god module

It contains the permission engine, currency-symbol lookup, time formatting, list coercion, string helpers, and Trackmania message formatting — and is imported by both client and server code.

**Recommendation** — split into `lib/permissions.ts`, `lib/format/{time,currency,tm}.ts`, `lib/collections.ts`. Cheap, mechanical, and it stops the client bundle pulling in server-only logic.

### 7.3 Component layout is by *kind*, not by *feature*

`src/components/modals/hetzner/`, `src/forms/admin/hetzner/`, `src/actions/hetzner/`, `src/types/api/hetzner/` — one feature spread across four trees. `src/lib/scripts.ts` is 2,507 lines of game-mode script metadata sitting in `lib/`.

**Recommendation** — as new features land, colocate by feature (`src/features/hetzner/{actions,components,schemas,types}.ts`); move `scripts.ts` to a data module (or the database — it is static reference data being shipped in the JS bundle graph).

### 7.4 Mixed HTTP clients

`lib/api/nadeo.ts` uses `fetch`; `lib/axios/{hetzner,ecircuitmania}.ts` use axios (with a nice error-normalizing interceptor). **Recommendation** — pick one. `fetch` + a small `httpClient` wrapper reproduces the interceptor in ~30 lines and drops a dependency; or standardize on axios everywhere. Either is fine; both is not.

---

## 8. Plugin system

`src/plugins/` with an abstract `Plugin<ConfigType>` base and lifecycle hooks (`onLoad`/`onStart`/`onUnload`/`onConfigUpdate`) is a genuinely good design. Limits worth noting:

- **The registry is a hard-coded array** in `PluginManager`'s constructor — every plugin is instantiated for every server whether enabled or not, and third parties cannot add one without forking.
- **`config` is `unknown` at the boundary**: `plugin.setConfig(clientPlugin.config)` casts DB JSON straight into `ConfigType` with no validation. A malformed config row is a runtime crash inside a live match.
- **No isolation**: a throw in one plugin's handler propagates into the GBX event loop shared by all plugins on that server.
- Plugin metadata is duplicated between the class statics (`pluginId`, `gamemodes`, `helpText`) and seed migrations (`..._match_admin_plugin`, `..._player_info_plugin`, …).

**Recommendation** — give each plugin a **zod config schema** as a static (validate in `setConfig`, and reuse the same schema to *generate* the settings form — that also kills `match-form.tsx`, currently 893 lines); wrap every plugin hook invocation in try/catch with per-plugin error isolation; move the registry to a manifest so metadata has one source of truth.

`src/plugins/match/index.ts` at 994 lines is doing too much for one plugin — split the pick/ban state machine out from the event handlers.

---

## 9. Observability

Well ahead of typical for a project this size: pino with per-server child loggers, Sentry with structured `meta`, an audit log. Two ergonomics issues:

- **110 hand-written `const meta = { type, module, function }` blocks** and 45 `reportException` calls. It is boilerplate that drifts (some blocks omit `function`).
- **`doServerActionWithAuth` logs and reports every error**, including expected ones — an `Unauthorized` throw becomes a Sentry event. Sentry signal-to-noise degrades and quota burns on normal behaviour.

**Recommendation** — derive `meta` inside the wrapper (the action name is available); classify errors so expected `ServerError`s (`Unauthorized`, validation) log at `warn` and skip Sentry, while unexpected ones report. Consider OpenTelemetry (Next.js 16 has built-in instrumentation hooks) if you ever want request tracing across the Nadeo/Hetzner/GBX calls.

---

## 10. Testing and CI

**There are zero test files in the repository.** CI (`nextjs-build-check.yml`) runs `bun install` + `prisma generate` + `next build` on a `[mysql, postgres]` matrix. It does **not** run lint, an explicit typecheck, or any tests, and `bun install` is not `--frozen-lockfile` (unlike the Dockerfile, which is).

For an application that provisions billed cloud servers over SSH and enforces a non-trivial permission model, this is the highest-risk gap in the review.

**Recommendation** — highest priority, in this order:

1. **Vitest** + unit tests for the pure logic that already exists and is easy to cover: `hasPermissionsJWTSync` (and its mutation bug), `getList`, `formatMessage`, `matchPattern` in the GBX manager, the reverse-cup scoring helpers, `getErrorMessage`.
2. **Integration tests for Server Actions** against a throwaway Postgres (Testcontainers or a CI service container) — permission enforcement per action is exactly the thing that must not silently regress.
3. **Playwright smoke test**: log in (mocked Nadeo provider) → load dashboard → open a server page.
4. Add `bun run lint` and `tsc --noEmit` to CI, and `--frozen-lockfile` to the install step.

---

## 11. Dependencies and build

### 11.1 Dead and dangerous dependencies

| Package | Status |
|---|---|
| `fs`, `path` | **Remove now.** These are npm *placeholder/shim* packages shadowing Node built-ins; `fs@0.0.1-security` is a squatting placeholder. |
| `@types/axios` | Deprecated stub — axios ships its own types. |
| `twig` + `@types/twig` | 0 imports. |
| `react-rnd` | 0 imports. |
| `is-localhost-ip` | 0 imports. |
| `range_check` + `@types/range_check` | 0 imports. |
| `@types/pkg-dir` | Stub; `pkg-dir` is native TS. |
| `radix-ui` (meta) alongside 18 individual `@radix-ui/react-*` | 1 import from the meta package — pick one style; the meta package plus individuals risks two copies of the same primitive. |

### 11.2 Version mismatches

- `eslint-config-next` is pinned to **15.2.4** while `next` is **^16** — lint rules are a major version behind the framework.
- `zod@^3.24` while the ecosystem (and `@hookform/resolvers@^5`) has moved to zod 4; worth planning, especially since §3.1 expands zod's role considerably.
- `next-auth@4` — see §5.3.

### 11.3 Docker image

`Dockerfile` copies `.next/standalone` **and then** the full `node_modules`, which defeats `output: "standalone"` output tracing — the whole point of which is to *not* ship `node_modules`. It is presumably there so `start.sh` can run `npx prisma migrate deploy`.

**Recommendation** — run migrations as a separate step (init container / deploy job / `prisma migrate deploy` in the pipeline), and let the runtime image keep only the traced standalone output. Expect a large image-size reduction. Also add a `HEALTHCHECK` and pin the base image (`node:23-alpine` → a digest or at least `node:24-alpine` on an LTS line; 23 is not LTS).

### 11.4 Deployment

Both deploy workflows SSH into a host and run `sudo /usr/local/bin/deploy-gocontrolpanel`. There is no health gate, no smoke test, and no rollback path in the pipeline; combined with §4.1 (single stateful instance) a bad deploy means downtime mid-match.

**Recommendation** — after §4.1 makes web instances stateless, move to two replicas behind the reverse proxy with a `/api/health` readiness check, and deploy one at a time.

---

## 12. Suggested order of work

| Phase | Work | Why first |
|---|---|---|
| **1 — Safety net** | Vitest + tests for permissions/utils/GBX helpers · lint + typecheck in CI · fix `hasPermissionsJWTSync` mutation (§5.1) · fix `ServerResponse` union (§3.2) · drop dead deps (§11.1) | Small, isolated, makes everything below safe |
| **2 — Boundary hardening** | Zod validation in Server Actions (§3.1) · shared schemas · error sanitization (§3.3) · centralize permission constants (§5.4) · `middleware.ts` (§1.2) | Closes the real security gaps; no architectural churn |
| **3 — Data layer** | Codegen both schemas from one source · normalize `Json` columns · delete `getList` · repository layer (§2.1) | Unblocks trustworthy types everywhere |
| **4 — Runtime split** | GBX worker + Redis pub/sub (§4.1) · BullMQ for provisioning (§6) · stateless web tier · SSE or extracted WS server (§1.5) | The scalability and reliability ceiling |
| **5 — Frontend** | TanStack Query + revalidation (§1.1) · unify add/edit forms (§7.1) · split `utils.ts` (§7.2) · schema-driven plugin config forms (§8) | Large line-count reduction, low risk once tests exist |

---

## What is already good

Worth stating plainly, because the list above is long:

- **`doServerAction*`** gives every mutation uniform error handling, logging, and Sentry reporting — most codebases this size have none.
- **The plugin architecture** (lifecycle hooks, gamemode gating, per-server managers, manialink manager separation) is a real extension point, not an accident.
- **The permission model** is genuinely expressive (global / group / per-server / per-project roles, `:id` templating) and centrally described in `routePermissions`.
- **Structured logging with per-server child loggers** plus an audit log is the right instinct for a multi-tenant control panel.
- **The Redis token-bucket rate limiter** is a correct Lua implementation, not a racy read-modify-write.
- **In-flight request deduplication** for Nadeo auth (`authenticateInFlight`) shows attention to a subtle failure mode.
- The dual-database **CI build matrix** shows the sync risk in §2 is already understood.

---

# Progress log

Work is applied in the phase order of §12, **one feature branch per change**.
`dev` is protected, so nothing is merged into it: the branches form a linear stack,
each based on the previous, and each is pushed for its own PR.

    dev (origin/dev)
     └─ docs/architecture-review
         └─ chore/prune-dead-dependencies
             └─ chore/ci-quality-gates
                 └─ fix/permission-resolution-purity
                     └─ fix/server-response-discriminated-union
                         └─ refactor/permission-constants

| # | Branch | Phase | Status |
|---|---|---|---|
| 1 | `docs/architecture-review` | — | ✅ merged |
| 2 | `chore/prune-dead-dependencies` | 1 | ✅ merged |
| 3 | `chore/ci-quality-gates` | 1 | ✅ merged |
| 4 | `fix/permission-resolution-purity` | 1 | ✅ merged |
| 5 | `fix/server-response-discriminated-union` | 1 | ✅ pushed |
| 6 | `refactor/permission-constants` | 2 | ✅ pushed |
| 7 | `fix/error-sanitisation` | 2 | ✅ pushed |
| 8 | `feat/validate-action-input` | 2 | ✅ pushed |
| 9 | `feat/auth-proxy` | 2 | ✅ pushed |

## 1 · `docs/architecture-review`

This document. Baseline review of the codebase as of `77bd9195`.

## 2 · `chore/prune-dead-dependencies` — §11.1, §11.2

Removes packages with zero imports and the shim packages that shadow Node built-ins.

**Removed from `dependencies`** (verified 0 imports repo-wide first):
`fs`, `path` (npm placeholders shadowing the Node built-ins), `jsonwebtoken`,
`is-localhost-ip`, `range_check`, `react-rnd`, and the stub/dead type packages
`@types/axios`, `@types/jsonwebtoken`, `@types/pkg-dir`, `@types/range_check`,
`@types/twig`.

**Moved to `devDependencies`:** `@types/react-world-flags`, `@types/ws`.

**Dropped the `radix-ui` meta package.** It pulls in every Radix primitive but had a
single import site (`src/components/ui/accordion.tsx`), which now uses
`@radix-ui/react-accordion` directly, matching the other 18 primitives.

**Bumped `eslint-config-next` 15.2.4 → ^16** to match Next 16. That config is a
native flat config in v16, so `eslint.config.mjs` was rewritten without the
`@eslint/eslintrc` `FlatCompat` shim (which crashed outright against v16), and
`@eslint/eslintrc` was removed. `next lint` is gone in Next 16, so the `lint`
script is now `eslint .`.

Two rules were tightened while the config was being rewritten:
- `react-hooks/rules-of-hooks`: `warn` → `error` (0 existing violations — free).
- `@typescript-eslint/no-explicit-any`: `off` → `warn` (31 warnings, to ratchet down).

`eslint-plugin-react-hooks@7` ships the React Compiler rule family, which flagged
32 new errors. 15 of them are `set-state-in-effect` on the fetch-in-`useEffect`
pattern that phase 5 replaces wholesale, so the family is set to `warn` for now
with a comment pointing at that phase. **Lint is at 0 errors / 77 warnings.**

*Net: 14 packages removed.*

## 3 · `chore/ci-quality-gates` — §10

Gives the project a test harness and makes CI gate on more than "it compiles".

**Vitest.** `vitest.config.ts` with `vite-tsconfig-paths` so tests resolve the `@/`
alias, `environment: "node"`, picking up `src/**/*.{test,spec}.{ts,tsx}`. Scripts:
`bun run test` and `bun run test:watch`. Nothing in this suite touches a database,
Redis or a game server — integration suites get their own project when they land.

**First 25 tests** in `src/lib/__tests__/utils.test.ts`, covering the pure helpers
named in §10: `formatTime`, `getErrorMessage`, `getList`, `formatBytes`,
`getCurrentId`, `isValidHetznerServerName`, and the string helpers.

> **They found a bug on the first run.** `getErrorMessage` tested
> `error instanceof Error` and *then* separately tested for an object with a
> `message` property. Every `Error` satisfies both, so the second branch always
> won and the first was dead code — meaning every error message in the
> application was being silently capitalised (`"boom"` → `"Boom"`). The second
> branch is now an `else if`. Fixed here rather than deferred to §3.3, since the
> test that caught it lives on this branch.

**`bun run typecheck`** via a new `tsconfig.typecheck.json` that checks `src/**`
only. A plain `tsc --noEmit` on the root config fails on 13 errors in `.next/types`:
stale route types for deleted pages, plus Next 16 rejecting the `UPGRADE` export
that `next-ws` requires on every WebSocket route. Neither is a source defect, and
neither is fixable without the §1.5 next-ws work, so the gate checks source and
`next build` continues to cover the rest. **`src/**` typechecks clean.**

**CI (`.github/workflows/nextjs-build-check.yml`, renamed to `CI`)** now runs a
`quality` job — `lint`, `typecheck`, `test` — alongside the existing `[mysql,
postgres]` build matrix. Installs use `--frozen-lockfile` (previously the
Dockerfile used it but CI did not, so CI could silently pass against a different
dependency tree than production). Also bumped `actions/checkout` v3→v4 and
`setup-bun` v1→v2, and fixed the build cache key, which hashed `bun.lockb` and
`next.config.js` — neither of which exists in this repo, so the cache never hit.

**Current gate status: lint 0 errors / 77 warnings · typecheck clean · 25 tests passing.**

## 4 · `fix/permission-resolution-purity` — §5.1

`hasPermissionsJWTSync` took `const userPermissions = jwt.permissions` — *the same
array reference*, not a copy — and then pushed every derived group, project and
server permission into it. Each call therefore mutated the caller's session object
and grew the array, and the whole derivation was redone from scratch on every one
of the ~185 permission checks.

Replaced with a pure `resolvePermissions(jwt): Set<string>` that builds a fresh
set and never touches its input; `hasPermissionsJWTSync` now resolves once and
does set lookups instead of `Array.includes` scans.

13 regression tests in `src/lib/__tests__/permissions.test.ts` cover the purity
guarantee (the token is unchanged after repeated calls), each derivation rule,
the `:id` substitution, the admin bypass, and the empty-requirements case.

> **History note for whoever picks this up:** the code change itself is not in
> this branch. A `git add -A` on branch 2 swept `src/lib/utils.ts` and
> `tsconfig.typecheck.json` into commit `b708e4ba` ("chore: prune dead
> dependencies…") alongside the dependency work. The intended history rewrite was
> blocked by the sandbox, and nothing had been pushed, so rather than force the
> issue this branch carries the tests and this note. **`b708e4ba` contains three
> things: the dependency pruning, the permission purity fix, and
> `tsconfig.typecheck.json`.** Later branches stage files explicitly.

## 5 · `fix/server-response-discriminated-union` — §3.2

`ServerResponse<T>` declared `data: T` as always present, while the failure path
returned `data: undefined as T`. The compiler therefore waved through every call
site that read `data` before checking `error`.

**The discriminant is `ok`, not `error`.** This was measured, not assumed:
TypeScript only narrows on a property with a *unit* type, and `error: string` is
not one. A quick experiment confirmed that with `{ data: T; error?: undefined } |
{ data?: undefined; error: string }`, neither

```ts
const { data, error } = await f(); if (error) return; data.length;  // ✗ still error
const res = await f();            if (res.error) return; res.data;  // ✗ still error
```

narrows, whereas a boolean literal `ok` narrows even through destructuring. Since
essentially every call site destructures and guards on `error`, `ok` is the only
shape that works. Final type:

```ts
export type ServerResponse<T = void> =
  | { ok: true; data: T; error?: undefined }
  | { ok: false; data?: undefined; error: string };
```

**Applying it surfaced 121 type errors** — every one a site reading `data` without
having proven it exists. Fixed in three groups:

1. **47 sites** already guarded correctly and only needed the discriminant: a
   scripted pass added `ok` to the destructuring pattern and turned `if (error)`
   into `if (!ok)` (`if (!error)` into `if (ok)` for the positive form). The
   116 `{ error }`-only mutation call sites were untouched — they never read
   `data`, so the type change does not affect them.
2. **Sites that never guarded at all** — the real latent bugs. Server components
   that passed a possibly-`undefined` payload into a required prop now either
   carry a destructuring default (`= []`, `= ""`) where an empty state is the
   sensible outcome, or render an explicit failure state where the payload is
   dereferenced unconditionally (`plugins/page.tsx`).
3. **Two hand-written narrowing hazards:**
   - `use-pagination-api.ts` — **the crash predicted in §3.2 was real.** It
     destructured `data: { data, totalCount }` *before* testing `error`, so any
     failing paginated fetch threw a `TypeError` on the failure path instead of
     the intended `ServerError`. Every paginated table in the app went through
     this. Now narrows first, then unpacks.
   - `use-search-users.ts` used `let data, error` with assignment-destructuring
     in branches, which is implicitly `any` and cannot narrow; rewritten to hold
     the response object.

The scripted pass needed one correction: its guard rewrite was file-global, so in
files that also had `{ error }`-only sites it flipped guards that had no `ok` in
scope. TypeScript caught all 28 (`Cannot find name 'ok'`) and they were restored.

**Verified:** `bun run typecheck` clean · `bun run lint` 0 errors · 38 tests pass ·
`bun run build` succeeds. 56 files changed. Note that `prettier --write` on the
touched files also normalised some pre-existing over-long lines, which widens the
diff beyond the semantic change.

### Phase 1 is complete

| §  | Item | Status |
|----|------|--------|
| 10 | Vitest + tests for permissions/utils | ✅ 38 tests |
| 10 | lint + typecheck + `--frozen-lockfile` in CI | ✅ |
| 5.1 | `hasPermissionsJWTSync` mutation | ✅ |
| 3.2 | `ServerResponse` discriminated union | ✅ |
| 11.1 | dead dependencies | ✅ 14 removed |

Bonus fix found by the new tests: `getErrorMessage` branch shadowing (§3.3 partial).

**Next up — phase 2 (boundary hardening):** zod validation inside server actions
(§3.1), shared form/action schemas, error sanitisation (§3.3), centralised
permission constants (§5.4), `middleware.ts` (§1.2).

## 6 · `refactor/permission-constants` — §5.4

Permission strings lived in four places that could drift: a `permissions` array in
`lib/utils.ts`, the `routePermissions` tree in `routes/index.ts`, a hand-written
list in `ROLES.md`, and bare literals at every check site. Nothing type-checked a
typo, and a mistyped permission fails *closed* and silently — it simply never
matches, so the feature looks broken rather than misconfigured.

New `src/lib/permissions.ts` is now the single source of truth. It separates the
two kinds of permission, which had never been distinguished:

- **Grantable** — `PERMISSIONS` (27 of them), what the role editor offers.
- **Role-derived** — synthesised at check time from group/project/server
  membership (`servers::admin`, `hetzner:<id>:admin`). Never stored, so they must
  never appear in the grantable list.

`PermissionCheck = Permission | RolePermission` is now the parameter type of
`doServerActionWithAuth`, `withAuth`, `hasPermission` and `hasPermissionsJWTSync`.
`RolePermission` is a template-literal type, so the interpolated forms still type.
`routePermissions` carries `as const satisfies PermissionTree`, which validates
all ~180 leaves in a single annotation.

> ### This found a live authorization bug
>
> `updateHetznerServer` required `["hetzner:servers:update", …]`. **There is no
> such grantable permission** — its siblings are `view` / `create` / `manage` /
> `delete`. The check could therefore never be satisfied by a grant, so the action
> was reachable only by global admins and project admins; a user granted
> `hetzner:servers:manage` was silently denied. Corrected to
> `hetzner:servers:manage`.
>
> **This slightly widens access** — holders of `hetzner:servers:manage` can now
> update server labels, which is what the permission's name promises and what its
> siblings already allow. Flagging it explicitly in case that is not wanted.

`ROLES.md` had drifted too: it was missing `audit-logs:view`, `audit-logs:delete`,
`servers:clients:view` and `servers:clients:manage`. It is now **generated** by
`scripts/generate-roles-doc.mjs` (`bun run generate:roles`), and CI regenerates it
and fails on any diff, so the doc cannot fall behind the constant again.

**Verified:** typecheck clean · lint 0 errors · 38 tests · `bun run build` succeeds.

## 7 · `fix/error-sanitisation` — §3.3, §9

`doServerAction*` returned `getErrorMessage(error)`, which is `error.message` for
any `Error`. A Prisma failure, an ssh2 failure or a fetch failure was forwarded
verbatim to the browser, quoting queries, columns and hostnames.

One fact made a clean fix possible: **there are no bare `throw new Error(...)`
sites in `src`** — all 336 deliberate throws are `ServerError`. Authorship is
therefore a reliable signal for whether a message is safe to show. New
`src/lib/errors.ts` classifies in this order:

1. `ServerError` — ours, written for this situation → exposed (XML-RPC faults
   still unwrapped).
2. **Any other `Error`** — Prisma, ssh2, undici, `TypeError` → generic
   `"Something went wrong"` / `InternalError`; the original still reaches pino
   and Sentry.
3. Plain object with string `code` + `message` — the Hetzner axios interceptor's
   rejection shape, i.e. third-party *validation* feedback → exposed.
4. Anything else → generic.

> **Step 2 has to precede step 3, and a test is what proved it.** My first version
> checked the Hetzner shape before the general `Error` case. But a Prisma error
> *also* carries string `code` and `message` properties (`"P2022"`), so it matched
> the Hetzner branch and its message — which quotes the failing query — would have
> been sent to the client. Exactly the leak the module exists to stop. Hetzner
> rejections are plain object literals and never `Error` instances, which is the
> discriminator now used.

**Sentry noise (§9).** `isExpectedError` marks routine failures — currently
`Unauthorized` and `ValidationError`. Those are logged at `warn` and skip Sentry;
everything else reports as before. `withAuth` no longer calls `reportException`
itself for unauthorized requests, which previously made every failed permission
check a Sentry event.

`getErrorMessage` stays, now documented as diagnostics-only. Its remaining
server-side callers are audit-log entries, which *should* keep full detail.

15 tests in `src/lib/__tests__/errors.test.ts` pin the classification down,
including the Prisma-shaped case above.

**Verified:** typecheck clean · lint 0 errors · 47 tests · `bun run build` succeeds.

## 8 · `feat/validate-action-input` — §3.1 (first slice)

`zod` was imported in 46 files and **none of them were server actions**. Every
schema ran only in the browser, so an attacker calling an action directly bypassed
validation entirely.

`src/lib/validation.ts` adds `validate(schema, input)`, which `safeParse`s and
throws a `ServerError` coded `ValidationError` on failure. That code is already in
the expected set from branch 7, so a bad payload produces safe field feedback for
the caller, a `warn` log, and no Sentry event.

**Applied to the 11 actions that accept a form payload** — deliberately the first
slice, because these are where unvalidated input does real damage: they provision
Hetzner servers, create databases, volumes and networks, run SSH setup scripts,
write files, and save server settings.

| File | Actions |
|---|---|
| `actions/hetzner/server-setup.ts` | `createAdvancedServerSetup`, `createSimpleServerSetup`, `addTrackmaniaServer` |
| `actions/hetzner/servers.ts` | `createHetznerDatabase`, `attachHetznerServerToNetwork` |
| `actions/hetzner/networks.ts` | `createHetznerNetwork`, `addSubnetToNetwork`, `removeSubnetFromNetwork` |
| `actions/hetzner/volumes.ts` | `createHetznerVolume` |
| `actions/gbx/server.ts` | `saveServerSettings` |
| `actions/filemanager/index.ts` | `createFileEntry` |

The payload parameter is now typed `unknown` rather than the schema type, so the
compiler cannot be satisfied by an unchecked cast — the only way to get a typed
value is to run it through `validate`. Validation happens as the first statement
*inside* the `doServerActionWithAuth` callback, so failures flow through the
normal error path. `prettier-plugin-organize-imports` stripped the now-unused
`…SchemaType` imports automatically.

Schemas are imported from `src/forms/**` in place. Relocating them to a shared
`src/schemas/` (as §3.1 suggests) is a pure move with no behaviour change and is
left for a follow-up; the current location already works for both sides.

### Explicitly not done yet

**Scalar parameters are still unvalidated** — `projectId: string`,
`serverId: number` and friends across all 224 actions. Most are self-protecting,
since an id that does not exist simply fails its permission check or its query.
The exception worth a follow-up branch is ids interpolated into outbound URLs
(`getHetznerServer(token, serverId)`), where a non-numeric value is a path
-injection vector that TypeScript cannot prevent at runtime. The remaining ~213
actions therefore still need an id-guard pass.

5 tests in `src/lib/__tests__/validation.test.ts`, including that unknown
properties are stripped (a caller cannot smuggle extra fields into a database
write) and that the resulting error is client-safe but not Sentry-worthy.

**Verified:** typecheck clean · lint 0 errors · 52 tests · `bun run build` succeeds.

## 9 · `feat/auth-proxy` — §1.2, §7.2 (partial)

There was no route-level gate at all: every page re-implemented
`hasPermission(...)` then `redirect(...)`, so an unauthenticated request still ran
layout code, a session lookup and often a query before being turned away.

**`src/proxy.ts`** — note the filename. §1.2 said `middleware.ts`; that convention
is **deprecated in Next 16**, which warns at build time and points at
`proxy.ts`. The build now reports `ƒ Proxy (Middleware)`.

It does two things: redirect to `/login` (preserving a `callbackUrl`) when there
is no token, and apply route-level permissions from `src/lib/route-guard.ts`.

**It is defence in depth, not a replacement.** Every page keeps its own
`hasPermission` check. Two reasons: the finer per-feature permissions
(`game.mapActions`, `game.scriptSettings`) describe UI elements rather than whole
pages and cannot be collapsed into a route rule without denying people pages they
can legitimately use; and any route not listed still needs its own check. Each
guard mirrors *exactly* what its page already enforces, so a mismatch can only
cause an unnecessary redirect, never a lockout.

Only the admin area is gated. The matcher excludes `api` (server actions and route
handlers authenticate themselves; NextAuth's own endpoints must stay reachable
while signed out; and a redirect would break a WebSocket upgrade handshake rather
than deny it cleanly), `_next`, static assets, and `/login` itself.

**Also moved `hasPermissionSync`, `hasPermissionsJWTSync` and `resolvePermissions`
out of `lib/utils.ts` into `lib/permissions.ts`** (17 importers repointed). They
belong with the permission constants, and it keeps the proxy's import graph small
— `utils.ts` pulls in clsx, tailwind-merge, route tables and form schema types,
none of which should ride along into the edge runtime. `resolvePermissions` no
longer calls `getList`, using a local array guard instead, so `permissions.ts` has
no dependency on the utils grab-bag. This is a first slice of §7.2.

6 tests in `src/lib/__tests__/route-guard.test.ts`, including the ordering trap:
`/admin/hetzner/` must not swallow `/admin/hetzner`, since the project page uses
an id-scoped permission and the index does not.

> **Not verified at runtime.** Typecheck, lint, 58 tests and the production build
> all pass, and the matcher is written to avoid redirect loops (`/login` and
> `/api` are excluded, and the dashboard has no guard). But I could not exercise a
> real sign-in against a running instance from here, so **the login round-trip and
> the `callbackUrl` hand-off should be smoke-tested on staging before this
> merges.** It is the one change so far whose failure mode is user-visible
> lockout.

**Verified:** typecheck clean · lint 0 errors · 58 tests · `bun run build` succeeds.

### Phase 2 is complete

| §  | Item | Branch |
|----|------|--------|
| 5.4 | centralised permission constants | 6 |
| 3.3 / 9 | error sanitisation + Sentry noise | 7 |
| 3.1 | zod validation in actions (form payloads) | 8 |
| 1.2 | route-level auth gate | 9 |

Carried forward: relocating schemas to `src/schemas/`, and the id-guard pass over
the remaining ~213 actions.

**Next up — phase 3 (data layer):** codegen both Prisma schemas from one source,
normalise the `Json`/array columns, delete `getList`, and introduce the repository
layer (§2, §2.1). Both MySQL and Postgres stay.
