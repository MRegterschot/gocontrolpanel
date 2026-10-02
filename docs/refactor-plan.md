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
| 4. Web cut-over | Next |
| 5. Server Actions → API routes | After 4 |

The `gbx-service` block in `docker-compose.yml` is commented out until phase 4, so it can't run alongside the web app's own GBX connections by accident.

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

### Phase 4: web cut-over (next step, not part of this branch's first deliverable)
- Next issues WS tickets (`/api/ws-ticket`). `useWebSocket` connects to the service, with the URL from env.
- `src/actions/gbx/**` and the GBX-touching parts of `database/servers.ts` / `server-plugins.ts` call the internal API. Lifecycle events are published after DB writes.
- Delete from web: `src/server.ts`, `next-ws`, `src/app/api/ws`, `src/lib/managers/{gbxclient,plugin,manialink}-manager.ts`, `src/plugins`, `src/lib/manialink`, the GBX boot in `instrumentation.ts`, `@evotm/gbxclient`, the handlebars deps.
- Web switches its duplicated types to `@gcp/shared`.

### Phase 5: Server Actions → API routes
NX-1…NX-8: route handlers with `withApiAuth`, a typed client data layer, and a service/route/client split per feature.

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
