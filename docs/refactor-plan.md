# Refactor plan: monorepo + GBX service

Companion to [backend-split-requirements.md](./backend-split-requirements.md) (requirement IDs `GS-*`, `NX-*`, `X-*`, `PM-*` refer to that document).

Branch: `refactor/monorepo-gbx-service`

## Status

| Phase | State |
|---|---|
| 0. Plan | Done |
| 1. Monorepo conversion | Done: web builds from `apps/web`; Prisma lives in `@gcp/db` |
| 2. Shared contracts | Done: `@gcp/shared` |
| 3. GBX service | Done: `apps/gbx-service`, 234 unit/component/HTTP/WS tests + 10 integration tests (real Postgres/Redis) + adapter tests against a fake GBXRemote 2 server |
| 4. Web cut-over | Done on `refactor/web-gbx-cutover`, pending the real-server run in [real-server-testing.md](./real-server-testing.md) §9 |
| 5. Reads → API routes | Done on `refactor/web-read-api`: every read a client component makes is a GET route; Server Actions are left for writes |

`docker-compose.yml` runs the web app and `gbx-service` side by side; the web app no longer opens GBX connections itself.

## Decisions

| Topic | Decision |
|---|---|
| Runtime / framework | Node.js + Fastify 5 |
| Monorepo tooling | Bun workspaces (`apps/*`, `packages/*`), Node as the runtime for the service |
| Service → DB | Direct Prisma access through the shared `@gcp/db` package. Next.js owns migrations |
| Next → service, lifecycle | Redis pub/sub channel (`gcp:server-events`) + an equivalent internal HTTP route |
| Next → service, commands | Internal HTTP API with a bearer service token. Allowlisted GBX passthrough + typed stateful commands |
| Browser → service, realtime | WebSocket with a short-lived HS256 ticket issued by Next (`@gcp/shared` signs and verifies) |
| Validation | zod schemas in `@gcp/shared` (source of truth for both apps) |
| Tests | Vitest. Unit tests on pure modules, component tests with in-memory fakes, HTTP/WS tests through Fastify, opt-in integration tests against real Postgres/Redis |
| Build | `tsup` bundles the service (workspace packages inlined, npm deps external) |

## Target layout

```
gocontrolpanel/
├─ package.json                 # private workspace root, proxy scripts
├─ apps/
│  ├─ web/                      # the existing Next.js app (moved, behaviour unchanged in phases 1–3)
│  └─ gbx-service/              # new Fastify service
├─ packages/
│  ├─ db/                       # @gcp/db: Prisma schemas (mysql + postgres), migrations, client factory
│  └─ shared/                   # @gcp/shared: domain types, permissions, WS + internal API contracts, ticket, lifecycle events
├─ docs/
└─ docker-compose.yml           # web + gbx-service + db + redis + dedicated + filemanager
```

## GBX service architecture

The current code is one 1.6k-line class (`GbxClientManager`) that owns the socket, the game state, persistence, chat, plugin wiring and WebSocket fan-out, and that everything reaches through `globalThis`. The new service splits those concerns. Each piece gets its dependencies through its constructor, so each one can be tested on its own.

```
src/
├─ main.ts                    # process entry (config → container → listen)
├─ config.ts                  # zod-validated env
├─ container.ts               # composition root: the only place that knows concrete implementations
├─ core/                      # domain logic, no IO imports (talks to ports)
│  ├─ ports.ts                # repository / store / external client interfaces
│  ├─ events.ts               # typed event bus + ServerEventMap
│  ├─ live/                   # LiveState (pure state + mutations), mode/settings parsing, points helpers
│  ├─ gbx/                    # GbxConnection interface, callback parser (raw → typed GameEvent), method allowlist
│  ├─ server/                 # ServerRuntime, ConnectionSupervisor (reconnect policy), ServerRegistry,
│  │                          # GameEventHandler, LiveSync, MatchRecorder, ServerCommands
│  ├─ chat/                   # chat formatting/splitting, ChatService, CommandRouter (/help, dispatch)
│  ├─ manialink/              # TemplateRenderer (runtime-compiled handlebars), ManialinkService, ActionRouter, components
│  └─ plugins/                # SDK (PluginContext), PluginHost (lifecycle + error boundary), built-in plugins
├─ infra/                     # adapters implementing the ports
│  ├─ gbx/                    # @evotm/gbxclient adapter (fresh client per connection attempt)
│  ├─ db/                     # Prisma repositories
│  ├─ redis/                  # jukebox store, lifecycle subscriber
│  ├─ nadeo/                  # Nadeo/Trackmania API client (subset) + Redis token cache + rate limiter
│  └─ ecm/                    # eCircuitMania client
└─ http/                      # Fastify app factory, service-token auth, internal routes, WS channels
```

**Dependency rule:** `http` and `infra` depend on `core`, and `core` never imports `infra`, `http`, Prisma, ioredis or Fastify. The only module that knows the concrete classes is `container.ts`. Tests build the same graph from in-memory fakes.

Main design changes compared to the current code:

- **One `ServerRuntime` per dedicated server, composed from small parts**, instead of a god object. `ConnectionSupervisor` owns connect/reconnect, with an injectable scheduler so the reconnect policy can be tested with fake timers.
- **A fresh GBX client per connection attempt.** That fixes duplicated callback listeners after reconnects (bug 1) by construction.
- **Raw callbacks are parsed into a typed `GameEvent` union by a pure function.** `GameEventHandler` applies them to `LiveState`, which is pure state with no IO, and emits on a **typed** event bus. A typo in an event name becomes a compile error.
- **Plugins get a `PluginContext` (PM-1).** Event, command, action, timer and manialink registrations made through the context are tracked and torn down automatically on unload, which removes the hand-written `off*` boilerplate and its leaks. A plugin is a definition (`id`, `gamemodes`, `helpText`, `create(ctx)`), and every load creates a fresh instance. Hooks run inside an error boundary (PM-5 groundwork).
- **The pick & ban logic is a pure state machine**, separated from the match plugin's IO, and unit tested.
- **Templates are compiled at runtime from `.hbs` files**, so the `build:templates` step goes away (PM-4 groundwork). Snapshot tests guard their output.
- **Manialink state is kept in memory.** It was in Redis before, but every connect wiped it, so Redis added nothing.
- **The active map is kept in the runtime** instead of the `active-map:{id}` Redis key, which nothing else reads.
- **WebSocket channels are declarative** (`authorize`, `snapshot`, event → message mapping), so each channel's access rule is a unit-testable function. Server connect/disconnect/reconnect and admin notifications go out on a registry-level bus, so sockets also see servers added after they connected.
- **Permission checks are pure.** The current `hasPermissionsJWTSync` mutates `jwt.permissions` on every call.
- **No global state.** `buildApp(deps)` returns a Fastify instance, and tests create as many as they like.

Bugs from requirements section 10 that this fixes: 1 (duplicate listeners), 2 (stop reconnect), 3 (resend manialinks), 4 (disconnect client), 5 (lifecycle events), 6 (WS side effects), 7 (notifications also cover direct server admins), plus bugs 8–17 that came up while porting and testing (listed in section 10 of the requirements).

## Phases

### Phase 0: plan (this document)
Exit: plan and requirements in `docs/`.

### Phase 1: monorepo conversion
- Move the Next.js app to `apps/web` (`git mv`, so history follows). Root `package.json` with workspaces and proxy scripts.
- `@gcp/db`: move the Prisma schemas + migrations out of `src/lib/prisma`. The generator outputs to `@prisma/client`, and web imports switch from `@/lib/prisma/generated` to `@gcp/db`.
- Web: `transpilePackages`, `outputFileTracingRoot`, Dockerfile, `start.sh` and the CI workflow updated for the new paths.

Exit: `bun install` at the root works, `bun run --filter web build` succeeds, and web behaviour is unchanged.

### Phase 2: shared contracts
- `@gcp/shared`: domain types (gbx callbacks, live, player, server, plugin configs), permissions, WS channel/message contract, WS ticket sign/verify, lifecycle event schema, internal API request/response schemas, shared Redis keys (jukebox).
- Unit tests for permissions, ticket and schemas.

Exit: `bun run --filter @gcp/shared test` is green.

### Phase 3: GBX service
Build in dependency order, with tests alongside each step:
1. Config, logger, error model, typed event bus.
2. Core live logic: LiveState, mode/settings parsing, callback parser.
3. Ports + in-memory fakes. Prisma repositories, Redis stores, Nadeo/ECM clients.
4. ConnectionSupervisor, GameEventHandler, LiveSync, MatchRecorder, ServerRuntime, ServerRegistry.
5. Chat service, command router, manialink renderer/service/components.
6. Plugin SDK + host. Port all ten built-in plugins.
7. HTTP: service auth, internal routes (status, controls, passthrough, stateful commands, live reads, lifecycle). WebSocket channels with ticket auth and heartbeat.
8. Lifecycle subscriber, container, `main.ts`, Dockerfile, compose service.

Exit: `bun run --filter gbx-service typecheck test build` is green, and the service connects to a real dedicated server in docker compose.

**At this point the web app still runs its own GBX managers.** Don't run both against the same dedicated servers in production (X-2) until phase 4 lands.

### Phase 4: web cut-over (branch `refactor/web-gbx-cutover`)
- Next issues WS tickets (`/api/ws-ticket`), which also return the browser-facing socket URL (`GBX_SERVICE_WS_URL`), so the URL isn't baked into the build. `useWebSocket` takes a channel path from `wsPaths`, fetches a ticket per attempt and reconnects with backoff; every channel resends its state on open.
- `src/lib/gbx-service.ts` is the only way the web app reaches a dedicated server: `getGbxClient(id)` for allowlisted passthrough calls, `gbxService.*` for stateful commands (script, match settings, script settings, pause, maps, points, chat, chat config, connection controls, plugin reload).
- The web app checks `GBX_SERVICE_TOKEN` and `WS_TICKET_SECRET` when it starts (before the Nadeo login) and exits with a list of what is missing or shorter than 32 characters, as the service does. Without this every live socket and every action on a server would fail later with an unrelated error.
- Requests from the web app to the service time out after 30 s (120 s for map-list changes, reconnect, plugin reload and match-settings load) instead of waiting for undici's 300 s default. A timeout is reported as `GbxServiceUnavailable` with a message that says the service did not respond in time. The service itself has no per-call timeout towards the dedicated server, so a frozen game server still pins that request inside the service.
- Lists that need one dedicated server call per item (ban, black and guest list players, local maps, the maps missing from the database) use `callEach` in the web app: one multicall per 100 items (the service limit) instead of one HTTP round trip each. An item the dedicated server rejects comes back as `null` and is shown as unknown or skipped, as before. A multicall answer of the wrong length is an error rather than a list of unknowns.
- The browser reconnects to the live channels with a growing delay (1 s up to 30 s). It starts over once a socket has stayed open for 10 s, not on open, because the service can accept a socket and close it at once. Close code 4403 (forbidden) is final. 4404 (server not managed, which is also what a just-created server gets until the service has registered it) is retried five times, about 31 s, and then given up. Every other code, including the 1001 that restarting proxies send, reconnects and resyncs.
- Lifecycle events go through `POST /internal/server-events` after DB writes (server create/update/delete, including the Hetzner setup flow, plugin enable/config changes, help-command toggle). HTTP goes first because it applies the change before the action returns. If it fails, the event is published on the Redis `gcp:server-events` channel the service subscribes to (best effort, since the web's Redis client doesn't reconnect after a drop); the service handles every event idempotently, so a duplicate is harmless. If both fail, it is logged as an error and sent to Sentry instead of thrown, because the DB write already succeeded and a service that is down reads all servers on start.
- Deleted from web: `src/server.ts`, `next-ws`, `src/app/api/ws`, `src/lib/managers/{gbxclient,plugin,manialink}-manager.ts`, `src/plugins`, `src/lib/manialink`, the GBX boot in `instrumentation.ts`, the manager-only DB helpers (records, matches, players, notifications), `@evotm/gbxclient`, `handlebars-layouts`, `ws`, `cookie`, `tsx`. `handlebars` stays for the Hetzner cloud-init templates.
- Web imports live, player, map and server types from `@gcp/shared`. Plugin config types stay in web for now: the forms edit the optional input shape, while the shared ones are zod output types.

### Phase 5: reads → API routes (branch `refactor/web-read-api`)
NX-1, NX-2, NX-7 and NX-8 for the reads. Forms and other writes stay Server Actions, which is what they are for: they are tied to a form submit, get CSRF protection and progressive enhancement, and need no client data layer.

- **Services.** Every read moved out of `src/actions/**` into `src/services/**` (same folders and names, `server-only`, no `"use server"`), so a read is no longer reachable as a POST action. A service is the old action body, unchanged: it still goes through `doServerActionWithAuth` with its permission list and returns `{ data, error }`. `src/actions/**` now holds writes only. Types, Prisma include shapes and helpers the writes need moved with them and are imported back.
- **Server components** (`page.tsx` and async tabs) import the services directly; nothing calls its own HTTP API during SSR.
- **Routes.** 45 `GET` handlers under `src/app/api`, one per read a client component makes (plus the paginated tables), grouped like the old folders: `servers/[serverId]/…`, `hetzner/[projectId]/…`, `nadeo/…`, `users`, `roles`, and so on. `apiRoute` (`src/lib/api-route.ts`) wraps each one: 401 without a session, the status that fits the failure (`Unauthorized` 403, `ServerNotFound` 404, `ServerNotConnected` and `GbxServiceUnavailable` 503, bad input 400, anything else 500), the `{ data, error, code }` envelope, and `Cache-Control: private, no-store`, because the payloads depend on the caller's permissions. Permissions are enforced by the services as before, so a route can't be more permissive than the action it replaces.
- **Input.** Query strings and path params go through zod. The paginated routes share one schema: `pageSize` is capped at 100 (a caller could previously ask a Server Action for a whole table), and `sortField` must be a plain column name because it ends up in a Prisma `orderBy`. Match export columns, TMX filters and ID lists are bounded too.
- **Client.** `src/lib/api-client/*` has the same function names and signatures as the old actions and returns the same `{ data, error }`, so call sites only changed their import. A failed request, including a network error or a non-JSON body from a proxy, comes back as an `error` and never throws. Payloads from the database get their ISO timestamps turned back into `Date`s (Server Actions preserved them; JSON does not); the Hetzner, Nadeo and TMX payloads are left as plain strings.
- **Paginated tables.** `PaginationTable` takes an `endpoint` instead of a server action (a function can't be passed from a server component to a client component over HTTP anyway). `usePaginationAPI` aborts the request it supersedes, so a slow answer for an old page can't overwrite a newer one.
- **Not changed.** Mutations, the uploads (NX-6, still `uploadFiles`), `getCampaignWithMaps` and the other reads only server components call (no route needed), and the Redis-only jukebox writes.
- Dead reads were deleted: `getUsersMinimal`, `getHetznerImages`, `getClubActivitiesPaginated`, `getClubMembersWithNamesPaginated`, `getServerPluginVariables`.

**TanStack Query** (branch `feat/web-tanstack-query`, on top of the above). The client reads go through `@tanstack/react-query` instead of `useEffect` + `useState` + try/catch + toast.
- `QueryProvider` sits in the root layout, one `QueryClient` per mount. Defaults: no retry (a failed read is almost always a stopped server or a missing permission) and no refetch on window focus (each read reaches a game server).
- `unwrap` (`src/lib/api-client/query.ts`) turns the client's `{ data, error }` into a thrown error, and `queryKeys` holds the cache keys, nested per server so one invalidation covers a server's reads. `useQueryErrorToast` keeps the old "toast once per failure".
- Migrated: the paginated tables (`usePaginationAPI`, with `keepPreviousData` and request cancellation from the query's signal), the ban, black and guest lists, the live player list (refetched when the socket reports a change), map info (cached 5 min), the jukebox (10 s polling), notifications (the socket and mark-as-read update the cache), the settings, server plugin and match plugin forms, the user, group and Hetzner forms and the add-server modal (`use-hetzner-queries.ts` shares locations, server types and SSH keys between forms for 5 min), Hetzner metrics, club room and campaign details, club activities (`useInfiniteQuery`) and the user search defaults.
- Left imperative on purpose: reads the user triggers, or whose result a component edits locally: the map order and local-maps refresh, TMX search and "load more", the exports, the Hetzner logs.
- Side effects of the move: the black and guest lists load when the page opens (they were empty until something changed them), and the user search defaults load once the session is there.

Checked against the e2e stack with the production build and a minted session: unauthenticated 401, a user without permissions 403 on the admin and server routes, `pageSize=5000` and `sortField=a.b` rejected with 400, and the database, GBX and TMX reads return data.

## Testing strategy

| Layer | What | How |
|---|---|---|
| Pure units | callback parser, LiveState transitions, mode/settings parsing, points, chat split/format, permissions, WS access rules, pick & ban state machine, allowlist | plain Vitest |
| Components | GameEventHandler, ConnectionSupervisor, ServerRuntime connect sequence, ServerCommands, PluginHost, ManialinkService, plugins | in-memory fakes (`FakeGbxConnection`, in-memory repositories), fake timers |
| Templates | every manialink template renders | snapshot tests |
| HTTP | auth, validation, allowlist, error mapping, every command route | `app.inject()` |
| WebSocket | ticket auth, snapshot on open, event fan-out, access denial | real `listen(0)` + `ws` client |
| Integration (opt-in) | Prisma repositories against Postgres, Redis adapters against Redis | `INTEGRATION_DATABASE_URL=… INTEGRATION_REDIS_URL=…` (CI: `workspace-check.yml`) |
| GBX adapter | connect, calls, multicall, callbacks, drops, refused connections | in-process fake GBXRemote 2 server |

Fakes live in `apps/gbx-service/test/fakes` and implement the same ports as the production adapters. The production adapters get their own tests: the Prisma and Redis adapters run in the opt-in integration suite, and the `@evotm/gbxclient` adapter runs against a minimal GBXRemote 2 server over TCP. Template output was checked byte-for-byte against the old precompiled templates before the snapshots were recorded.

## Risks

- **Behaviour drift while porting.** Mitigation: port logic line by line where semantics matter (live state, records), cover it with tests derived from the current code, and keep the web app's copy alive until phase 4 for side-by-side comparison.
- **Two controllers on one dedicated server** during the transition. The service gets a `GBX_SERVICE_ENABLED_SERVERS` allowlist (empty = all) so it can be pointed at a test server only.
- **Prisma generator output change** (`../generated` → `@prisma/client`) affects the web Docker image. Verify with `docker build` for both DB flavours.
