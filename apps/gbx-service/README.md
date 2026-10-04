# GBX service

Long-running Fastify service that owns every connection to the Trackmania dedicated servers. It runs the in-game plugins, records matches, and serves the live WebSockets the panel uses. The web app talks to it over an internal HTTP API. See [docs/refactor-plan.md](../../docs/refactor-plan.md) for the why.

## Running

```bash
cp .env.example .env     # the root .env is read from any folder; apps/gbx-service/.env is an optional override on top
bun run dev:gbx            # from the repo root, or `bun run dev` inside apps/gbx-service
```

The service needs the same database and Redis as the web app. Migrations are owned by the web app/`@gcp/db` (`bun run deploy`).

While the web app still opens its own GBX connections (until phase 4), set `GBX_SERVICE_ENABLED_SERVERS` to a test server's id. Otherwise both will control the same dedicated servers.

## Testing

```bash
bun run --filter @gcp/gbx-service test          # unit + component + HTTP/WS tests, no infrastructure needed
bun run --filter @gcp/gbx-service typecheck

# Prisma/Redis adapters against real databases
docker compose -p gcp-gbx-test -f apps/gbx-service/docker-compose.test.yml up -d
DB=postgres DATABASE_URL=postgresql://gcp:gcp@localhost:55432/gcp_test bun run deploy
INTEGRATION_DATABASE_URL=postgresql://gcp:gcp@localhost:55432/gcp_test \
INTEGRATION_REDIS_URL=redis://localhost:56379 \
  bun run --filter @gcp/gbx-service test:integration
docker compose -p gcp-gbx-test -f apps/gbx-service/docker-compose.test.yml down -v
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
| `src/core/plugins/` | Plugin SDK (`PluginContext`), `PluginHost`, built-in plugins, the marketplace watcher (takedowns) |
| `src/core/plugins/sandbox/` | Marketplace and uploaded plugins: QuickJS sandbox, the code that runs inside it, capability checks, limits |
| `src/infra/` | Adapters: `@evotm/gbxclient`, Prisma repositories, Redis, Nadeo, eCircuitMania, plugin HTTPS, the marketplace index, sandbox assets |
| `src/http/` | `buildApp()`, service-token auth, internal routes, WebSocket channels |
| `src/container.ts` | Composition root: the only file that picks concrete implementations |
| `templates/` | Manialink templates (`.hbs`), loaded at startup |

## Sandboxed plugins

Plugins installed from the [marketplace](../../docs/plugin-marketplace.md) or uploaded privately are packages, not code in this repository. `PackageLoader` reads the installed version from the database and checks its sha256. `SandboxedPlugin` then runs it in its own QuickJS WebAssembly instance and answers its host calls, but only those its granted capabilities allow. The code that runs inside the sandbox is `guest-runtime.ts`; it is serialized with `toString()`, so it can't use anything from its module. `test/plugins/sandbox.test.ts` runs packaged plugins against the fake dedicated server.

## Adding a plugin

The full guide, with the lifecycle, the whole context API, widgets and testing, is in [docs/builtin-plugins.md](../../docs/builtin-plugins.md). Plugins that aren't part of GoControlPanel use the sandboxed [plugin SDK](../../docs/plugin-sdk.md) instead.

Write a definition and register it in `src/core/plugins/builtin/index.ts`. The `id` must match a row in the `plugins` table.

```ts
export const helloPlugin = definePlugin({
  id: "hello",
  gamemodes: ["timeattack"], // omit for every mode
  helpText: "/hello - says hi",
  configSchema: z.object({ greeting: z.string().default("Hi") }),
  create: (ctx) => {
    ctx.command("hello", (_, login) => ctx.chat.sendTo(login, ctx.config()?.greeting ?? "Hi"));
    return {};
  },
});
```

Everything registered through `ctx` (events, commands, actions, timers, widgets, action-group buttons) is removed automatically when the plugin unloads.
