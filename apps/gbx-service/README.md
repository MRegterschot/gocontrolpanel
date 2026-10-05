# GBX service

Long-running Fastify service that owns every connection to the Trackmania dedicated servers. It runs the in-game plugins, records matches, and serves the live WebSockets the panel uses. The web app talks to it over an internal HTTP API. See [docs/refactor-plan.md](../../docs/refactor-plan.md) for the why.

## Running

```bash
cp .env.example .env     # the root .env is read from any folder; apps/gbx-service/.env is an optional override on top
bun run dev:gbx            # from the repo root, or `bun run dev` inside apps/gbx-service
```

The service needs the same database and Redis as the web app. Migrations are owned by the web app/`@tmcp/db` (`bun run deploy`).

While the web app still opens its own GBX connections (until phase 4), set `GBX_SERVICE_ENABLED_SERVERS` to a test server's id. Otherwise both will control the same dedicated servers.

## Testing

```bash
bun run --filter @tmcp/gbx-service test          # unit + component + HTTP/WS tests, no infrastructure needed
bun run --filter @tmcp/gbx-service typecheck

# Prisma/Redis adapters against real databases
docker compose -p tmcp-gbx-test -f apps/gbx-service/docker-compose.test.yml up -d
DB=postgres DATABASE_URL=postgresql://tmcp:tmcp@localhost:55432/tmcp_test bun run deploy
INTEGRATION_DATABASE_URL=postgresql://tmcp:tmcp@localhost:55432/tmcp_test \
INTEGRATION_REDIS_URL=redis://localhost:56379 \
  bun run --filter @tmcp/gbx-service test:integration
docker compose -p tmcp-gbx-test -f apps/gbx-service/docker-compose.test.yml down -v
DB=mysql bun run generate   # `deploy` regenerated the client for Postgres; switch back if you develop on MySQL
```

To test against a real dedicated server (isolated Docker stack, seed script, `ws:watch` socket viewer), follow [docs/real-server-testing.md](../../docs/real-server-testing.md).

`test/fakes/harness.ts` builds a real `ServerRuntime` on top of a scriptable fake dedicated server (`FakeGbxSession`) and in-memory repositories. Most behaviour tests are just "emit a callback, assert state/events/calls".

## Layout

| Path | What lives there |
|---|---|
| `src/core/` | Domain logic. Depends only on interfaces in `core/ports.ts`; never imports Prisma, ioredis or Fastify |
| `src/core/server/` | `ServerRuntime` (one per dedicated server), `ConnectionSupervisor` (retry policy), `GameEventHandler` (callbacks → state/events), `LiveSync`, `MatchRecorder`, `ServerCommands`, `ServerRegistry` |
| `src/core/live/` | `LiveState` and pure helpers (mode detection, script settings, cup points) |
| `src/core/gbx/` | `GbxConnection` port, callback parser, passthrough allowlist |
| `src/core/manialink/` | Runtime-compiled Handlebars renderer, `ManialinkService`, components |
| `src/core/plugins/` | `PluginHost`, the host-side `PluginContext`, the first-party installer, the marketplace watcher (takedowns) |
| `src/core/plugins/sandbox/` | Every plugin package: QuickJS sandbox, the code that runs inside it, capability checks, limits |
| `src/infra/` | Adapters: `@evotm/gbxclient`, Prisma repositories, Redis, Nadeo, plugin HTTPS, first-party packages, the marketplace index, sandbox assets |
| `src/http/` | `buildApp()`, service-token auth, internal routes, WebSocket channels |
| `src/container.ts` | Composition root: the only file that picks concrete implementations |
| `templates/` | Manialink templates (`.hbs`), loaded at startup |

## Sandboxed plugins

Plugins are packages: the first-party ones, plugins installed from the [marketplace](../../docs/plugin-marketplace.md) and private uploads. `PackageLoader` reads the installed version from the database and checks its sha256. `SandboxedPlugin` then runs it in its own QuickJS WebAssembly instance and answers its host calls, but only those its granted capabilities allow. The code that runs inside the sandbox is `guest-runtime.ts`; it is serialized with `toString()`, so it can't use anything from its module. `test/plugins/sandbox.test.ts` runs packaged plugins against the fake dedicated server.

## Plugins

Every plugin is a package, including the ones that ship with TMControlPanel. Those are built from [`plugins/`](../../plugins) into `first-party/`, and `installFirstPartyPlugins` stores them on every start, before any server connects, moving installs from before the marketplace onto them. See [docs/first-party-plugins.md](../../docs/first-party-plugins.md) for working on them and [docs/plugin-sdk.md](../../docs/plugin-sdk.md) for the API.
