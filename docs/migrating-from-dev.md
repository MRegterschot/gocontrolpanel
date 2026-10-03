# Migrating from `dev` to the monorepo + GBX service

This guide is for people running GoControlPanel from the `dev` branch (a single Next.js app with a custom server) who want to move to `refactor/monorepo-gbx-service`. For the reasoning behind the split see [refactor-plan.md](./refactor-plan.md).

## What changed

| | `dev` | `refactor/monorepo-gbx-service` |
|---|---|---|
| Processes | One container (`gocontrolpanel`) runs the web app, the GBX connections, the plugins and the live WebSockets | Two containers: `gocontrolpanel` (web) and `gbx-service` (GBX connections, plugins, manialinks, live WebSockets) |
| Repo layout | Next.js app at the repo root | Bun workspaces: `apps/web`, `apps/gbx-service`, `packages/db`, `packages/shared` |
| Browser WebSockets | Same origin as the web app (`/api/ws`, port 3000) | Directly on the GBX service (`/ws/*`, port 3100) with a short-lived ticket issued by the web app |
| Manialink state | Redis | In memory in the service (rebuilt on every connect) |
| Database schema | | **Unchanged.** The migrations were only moved to `packages/db/prisma`, with identical SQL |

The browser-facing app stays on port 3000. Dedicated servers, the file manager, MariaDB/PostgreSQL and Redis are untouched.

## Before you start

- **Back up the database** (`mysqldump` / `pg_dump`). The schema does not change, so the upgrade needs no data migration, but a rollback is only painless with a backup.
- **Only one controller may hold a GBX connection to a dedicated server.** The old container and the new `gbx-service` must never run against the same servers at the same time. Stop the old stack first (or use `GBX_SERVICE_ENABLED_SERVERS`, see [Staged rollout](#staged-rollout)).
- Know your database flavour (MariaDB/MySQL or PostgreSQL). It decides which image suffix you use for both app images.

## Upgrade steps (Docker Compose)

### 1. Generate two secrets

The web app and the service authenticate to each other with these. Both must be **at least 32 characters** and **identical in both containers**. Both apps refuse to start otherwise.

```bash
openssl rand -base64 32   # GBX_SERVICE_TOKEN
openssl rand -base64 32   # WS_TICKET_SECRET
```

### 2. Update `docker-compose.yml`

Compare with the [`docker-compose.yml`](../docker-compose.yml) in the repo root. Two changes:

**a) Add four variables to the existing `gocontrolpanel` service:**

```yaml
GBX_SERVICE_URL: http://gbx-service:3100       # server-to-server, container network
GBX_SERVICE_WS_URL: ws://localhost:3100        # opened by the browser, must be reachable from it
GBX_SERVICE_TOKEN: <secret 1>
WS_TICKET_SECRET: <secret 2>
```

`GBX_SERVICE_WS_URL` is returned to the browser and is *not* resolved inside Docker. Use the public host name of your server (for example `wss://gbx.example.com`), not `gbx-service`.

**b) Add the `gbx-service` service:**

```yaml
gbx-service:
  image: marijnregterschot/gocontrolpanel-gbx-service:beta # -postgres variant for PostgreSQL
  ports:
    - 3100:3100
  restart: unless-stopped
  environment:
    DATABASE_URL: <same as gocontrolpanel>
    REDIS_URI: <same as gocontrolpanel>
    GBX_SERVICE_TOKEN: <secret 1>
    WS_TICKET_SECRET: <secret 2>
    WS_ALLOWED_ORIGINS: http://localhost:3000  # origin(s) of the web app, comma separated
    NADEO_SERVER_LOGIN:
    NADEO_SERVER_PASSWORD:
    NADEO_CONTACT: GoControlPanel / <your contact info>
    NADEO_CLIENT_ID:
    NADEO_CLIENT_SECRET:
    LOG_LEVEL: info
  depends_on:
    - db
    - redis
    - gocontrolpanel # runs the database migrations
```

Copy the Nadeo values from the `gocontrolpanel` service. Everything else in the old service block (`NEXTAUTH_*`, `DEFAULT_*`, `HETZNER_KEY`, Sentry and Plausible variables) stays on the web container only.

> **Images.** The release workflow publishes `gocontrolpanel-gbx-service` (and the `-postgres` variant) next to the web image, with the same `latest`/`beta`/version tags. Set the repository variable `DOCKER_GBX_IMAGE_NAME` to use another image name.

If you started from one of the stacks in [`docker/`](../docker) (PyPlanet, EvoSC, ManiaControl, MiniControl), those compose files do not contain `gbx-service` yet. Add the block above to them and point `DATABASE_URL`/`REDIS_URI` at the same hosts the `gocontrolpanel` service uses.

### 3. Open port 3100 to browsers

The live pages, notifications and the server list now connect from the browser straight to the service. Make `GBX_SERVICE_WS_URL` reachable from your users' browsers:

- **Plain setup:** publish `3100` and use `ws://<host>:3100`.
- **HTTPS:** a page served over HTTPS may only open `wss://` sockets. Put a TLS-terminating reverse proxy in front of the service and set `GBX_SERVICE_WS_URL=wss://...`. The proxy must pass WebSocket upgrades.
- **Only expose `/ws/*` and `/health`.** The `/internal/*` routes are protected by `GBX_SERVICE_TOKEN` but are meant for the web container only; keep them off the public internet.
- Add the web app's public origin (for example `https://panel.example.com`) to `WS_ALLOWED_ORIGINS`. A socket from another origin is closed with code 4403. An empty value allows any origin.

#### Example: Nginx Proxy Manager

1. Create a proxy host (for example `gbx.example.com`) that forwards to `http` / `gbx-service` / `3100`. Use the host IP and port instead if NPM does not share a Docker network with the service. Turn on **Websockets Support**, request a certificate on the **SSL** tab and enable **Force SSL**.
2. On the **Advanced** tab, add this custom configuration so that only `/ws/*` and `/health` pass through:

   ```nginx
   location ~ ^/(?!(ws/|health$)) {
       return 404;
   }
   ```

   Nginx checks regex locations before NPM's generated `location /`. The negative lookahead keeps `/ws/` and `/health` out of the regex, so they use the normal proxy block and everything else, including `/internal/*`, returns 404. To also hide `/health`, use `(ws/)`.
3. Set `GBX_SERVICE_WS_URL: wss://gbx.example.com` on the web container and `WS_ALLOWED_ORIGINS: https://panel.example.com` on the service. `GBX_SERVICE_URL` stays `http://gbx-service:3100` because the web container talks to the service directly, not through NPM.
4. Remove `ports: - 3100:3100` from the `gbx-service` compose entry when NPM reaches it over the Docker network, or bind it to localhost with `127.0.0.1:3100:3100` when NPM runs on the host. Otherwise the port stays open and the proxy rules can be bypassed.
5. Check it:

   ```bash
   curl -i https://gbx.example.com/internal/servers   # 404
   curl -i https://gbx.example.com/health             # 200
   curl -i http://<server-ip>:3100/health             # should fail from outside
   ```

   In the browser dev tools the `/ws/live/...` socket should show `101 Switching Protocols`. A close with code 4403 means `WS_ALLOWED_ORIGINS` does not match the panel's origin exactly.

### 4. Cut over

```bash
docker compose pull
docker compose stop gocontrolpanel   # stops the old GBX connections
docker compose up -d
```

`docker compose up -d` recreates `gocontrolpanel` with the new image, which runs `prisma migrate deploy` (a no-op for an up-to-date `dev` database) and then starts the web app. `gbx-service` then connects to every server in the database.

Order matters only in that the old container must be gone before the service connects. Starting everything with one `up -d` after pulling is fine.

### 5. Verify

```bash
docker compose logs gocontrolpanel gbx-service
curl http://localhost:3100/health    # {"status":"ok","servers":N,"connected":N}
```

- `servers` is the number of servers in the database, `connected` how many the service reached. New servers can take a few seconds to connect.
- Open the panel, then a server's live page. Rankings and the map card should update, and the in-game manialinks and chat commands (`/help`) should be back.
- Check that a plugin (for example Match) still reacts to a map change.

## Variables

| Variable | Web | GBX service | Notes |
|---|---|---|---|
| `DATABASE_URL`, `REDIS_URI` | yes | yes | Same values in both |
| `GBX_SERVICE_TOKEN` | yes (new) | yes | ≥ 32 chars, identical |
| `WS_TICKET_SECRET` | yes (new) | yes | ≥ 32 chars, identical |
| `GBX_SERVICE_URL` | yes (new) | no | Internal URL of the service, default in compose `http://gbx-service:3100` |
| `GBX_SERVICE_WS_URL` | yes (new) | no | Browser-reachable socket URL |
| `WS_ALLOWED_ORIGINS` | no | yes (new) | Browser origins, comma separated |
| `NADEO_SERVER_LOGIN`, `NADEO_SERVER_PASSWORD`, `NADEO_CONTACT` | yes | yes | The web app exits on a wrong login at startup |
| `NADEO_CLIENT_ID`, `NADEO_CLIENT_SECRET` | yes | yes | Without them the service's account name lookups stay empty |
| `GBX_SERVICE_ENABLED_SERVERS` | no | optional (new) | Comma separated server ids to manage; empty manages all |
| `PORT`, `HOST` | no | optional (new) | Default `3100` / `0.0.0.0` |
| `ECM_URL` | no | optional (new) | Overrides the eCircuitMania API URL |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT` | no | optional (new) | The service reports to Sentry separately from the web app |
| `NEXTAUTH_*`, `DEFAULT_ADMINS`, `DEFAULT_PERMISSIONS`, `HETZNER_KEY`, `PLAUSIBLE_API_HOST`, `*SENTRY*` (web) | yes | no | Unchanged |

## Staged rollout

`GBX_SERVICE_ENABLED_SERVERS=<id>,<id>` limits the service to the listed servers. Use it to try the service on a test server while another instance (for example the old `dev` stack on a copy of the database) manages the rest. Never list a server that another controller is still connected to.

## Rollback

The database schema is unchanged, so rolling back is just running the old image again:

1. `docker compose stop gbx-service gocontrolpanel`
2. Switch the `gocontrolpanel` image back to the `dev` build and remove the `GBX_SERVICE_*` / `WS_TICKET_SECRET` variables (optional, they are ignored).
3. `docker compose up -d gocontrolpanel`

Never run both at once. Restore the dump only if you made schema changes of your own after upgrading.

## Things that behave differently

- **Redis** is still required (jukebox queue, Nadeo caches, lifecycle events). Manialink state and the active map are no longer stored there, so old `{serverId}:manialinks:*` and `active-map:*` keys are dead and can be deleted. Nothing reads them.
- **Plugin reloads and live reconnects** now go through the service. If the service is down, actions that touch a dedicated server show a "service unavailable" error while pages that only read the database keep working. Server create/update/delete and plugin config changes fall back to the Redis `gcp:server-events` channel; the service also reads all servers when it starts.
- **Server passwords** are no longer sent to the browser or written to the audit log. Nothing to do on your side.
- **Errors at startup are stricter.** The web app exits with a list of missing values when `GBX_SERVICE_TOKEN` or `WS_TICKET_SECRET` is missing or too short, and the service exits on invalid config. Read the container logs first when a container will not stay up.
- **Reconnects.** The browser reconnects to the live sockets with a growing delay. Close code 4404 (server not managed yet) is retried about five times, which covers a newly created server the service has not registered yet.
- **Built-in plugins** were ported to a new plugin SDK. Custom changes you made to `src/plugins/**`, `src/lib/manialink/**` or the manager classes on `dev` do not carry over and must be ported to `apps/gbx-service` (plugins in `src/core/plugins`, templates in `templates/`).

## For developers and forks

- Old paths: `src/**` → `apps/web/src/**`; `src/lib/prisma/{mysql,postgres}` → `packages/db/prisma/{mysql,postgres}`; `Dockerfile` and `start.sh` → `apps/web/`.
- Imports from `@/lib/prisma/generated` become `@gcp/db`. Live, player, map and server types come from `@gcp/shared`.
- Removed from the web app: `src/server.ts` (custom server), `next-ws`, `/api/ws`, the `gbxclient`/`plugin`/`manialink` managers, `build:templates` and `@evotm/gbxclient`. The web app reaches dedicated servers only through `apps/web/src/lib/gbx-service.ts`.
- Commands are now run from the repo root: `bun install`, `bun run infra:up`, `bun run deploy` (migrations), `bun run dev` (web) and `bun run dev:gbx` (service). See [CONTRIBUTING.md](../CONTRIBUTING.md).
- CI: `workspace-check.yml` typechecks, tests and builds both apps; the release workflow builds and pushes both images (`apps/web/Dockerfile` and `apps/gbx-service/Dockerfile`).
- To test a change against a real dedicated server, follow [real-server-testing.md](./real-server-testing.md).
