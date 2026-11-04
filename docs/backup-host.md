# Add a backup host

Use this setup to add another host to an existing TMControlPanel deployment. The extra host runs only the web app and `gbx-service`. It shares the database and Redis with the first host. Both hosts run workers and can take over each other's dedicated servers.

For a Contabo primary and a Hetzner Cloud backup, check availability before ordering. See the [high availability plan](high-availability-plan.md) for the design.

## Architecture

- Each host runs a web container and a GBX front with `GBX_WORKERS` worker processes.
- Each web container calls its own front at `http://gbx-service:3100`.
- Both hosts use the same database and Redis, reached over a private mesh. See the [database host guide](database-host.md) to move them off the primary.
- Redis leases give each dedicated server one worker owner across both hosts.
- Sessions, Codriver state and the Nadeo token cache live in Redis; web replicas are stateless.
- Either host's panel and browser WebSockets can serve every server.
- The operator routes HTTPS and WSS traffic between hosts; sticky sessions are not needed.

## Prerequisites

Use the same application version and database image flavour on both hosts. Install Docker Engine and Docker Compose on the new host. Back up the database before deploying. Size each host to carry all servers during failover, allowing roughly 80–150 MB per worker plus the front and web app.

Give every GBX container a unique `GBX_NODE_ID`, for example `node-a` and `node-b`. Docker's default hostname works but is harder to read in lease owners. Set `GBX_WORKERS` to at least `1` on both hosts. `0` disables clustered ownership and must not be used in this setup. Keep `GBX_LEASE_TTL_MS` identical everywhere (default `15000`, minimum `6000`).

### Private networking

Contabo and Hetzner do not share a private network. Use WireGuard or Tailscale between the application hosts, the database/Redis host and the dedicated servers. Do not expose Redis, MariaDB or XML-RPC in plain text on public interfaces.

A minimal Tailscale setup on each Linux host:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
# Follow the sign-in link and join the same tailnet on every host.
tailscale ip -4
tailscale ping <other-host-mesh-ip>
```

Restrict tailnet access so only the application hosts can reach database port `3306`, Redis port `6379` and the dedicated servers' XML-RPC ports (usually `5000`). Apply equivalent host and provider firewall rules. Use the actual mesh IPs below; `100.64.0.10` is an example database host. Dedicated servers must join the mesh too, or be reached through a configured subnet router. Set their panel connection addresses to reachable private addresses.

For host-installed Redis, keep protected mode enabled and configure a password and mesh-only listener:

```bash
redis-server --bind 100.64.0.10 --protected-mode yes --requirepass '<existing-redis-password>'
```

Persist these settings in the service's Redis configuration. For host-installed MariaDB, set this in its server configuration and restart it:

```ini
[mariadb]
bind-address = 100.64.0.10
```

Create an application user allowed from the mesh subnet. Use the existing application's password, and grant access only to its database:

```sql
CREATE USER 'tmcontrolpanel'@'100.64.0.0/255.192.0.0' IDENTIFIED BY '<existing-database-password>';
GRANT ALL PRIVILEGES ON tmcontrolpanel.* TO 'tmcontrolpanel'@'100.64.0.0/255.192.0.0';
```

The example covers Tailscale's address range; narrower host grants are preferable when the host IPs are fixed. Confirm the source address MariaDB sees, especially with a subnet router.

If Redis and MariaDB run in Docker, the host mesh IP does not exist inside their containers. Keep their container listeners on the container interface and publish only on the host mesh IP, for example `100.64.0.10:6379:6379` and `100.64.0.10:3306:3306`. Keep Redis authentication enabled. Preserve access from the primary's web and GBX containers. Docker publishing can bypass UFW rules; enforce restrictions through Docker's forwarding rules or the provider firewall as well. Test access from both application containers, not only from the hosts.

On each dedicated server, allow XML-RPC from both application hosts' mesh IPs and reject public access. Keep the gameplay ports available to players. Do the same for private file-manager endpoints if used. Both web replicas need to reach those endpoints.

## Shared configuration

Copy the existing values. Do not generate fresh secrets for the extra node.

- `SHARED_DATABASE_URL`: the existing database over the mesh, for example `mysql://tmcontrolpanel:<encoded-password>@100.64.0.10:3306/tmcontrolpanel`.
- `SHARED_REDIS_URI`: the same Redis instance and logical database, for example `redis://:<encoded-password>@100.64.0.10:6379/0`.
- `SECRETS_KEY`, `GBX_SERVICE_TOKEN`, `WS_TICKET_SECRET`, `PANEL_INTERNAL_TOKEN` and `NEXTAUTH_SECRET`: identical across nodes. This app uses `NEXTAUTH_SECRET` as its auth secret. The service tokens and `SECRETS_KEY` must be at least 32 characters.
- `HETZNER_KEY` and, during a key rotation, `HETZNER_KEY_PREVIOUS`: preserve the existing encryption keys for stored Hetzner credentials.
- `NADEO_CLIENT_ID`, `NADEO_CLIENT_SECRET`, `NADEO_SERVER_LOGIN`, `NADEO_SERVER_PASSWORD` and `NADEO_CONTACT`: copy the existing Nadeo settings.

URL-encode passwords in connection URLs. Keep the environment file private (`chmod 600`). Copy optional fallback API keys and default permissions if used.

Set these values for the new node:

- `GBX_NODE_ID=node-b`, `GBX_WORKERS=1` (or more) and the shared `GBX_LEASE_TTL_MS`.
- `IMAGE_TAG`: the same release tag as the primary. Use `IMAGE_SUFFIX=-postgres` for PostgreSQL images; leave it empty for MariaDB/MySQL. Both services must use the same flavour.
- `NEXTAUTH_URL`: the public HTTPS panel URL. Prefer one stable panel domain routed to either host.
- `NADEO_REDIRECT_URI`: that panel URL followed by `/api/auth/callback/nadeo`. Register the exact callback with Nadeo. Register any separate host domains used for sign-in too.
- `GBX_SERVICE_WS_URL`: the public `wss://` endpoint reachable from browsers.
- `WS_ALLOWED_ORIGINS`: all allowed panel origins, comma separated, on both nodes.
- `GBX_SERVICE_ENABLED_SERVERS`: empty allows every server. If set, the backup can only take over the listed server IDs.

`GBX_SERVICE_URL` and `PANEL_INTERNAL_URL` are already set to the local containers in both node files. They must not point at the other host.

## Plain Docker deployment

1. Complete the mesh, database grants and firewall changes above. Check the existing deployment uses clustered workers and a unique node ID.
2. Copy `docker-compose.node.yml` to its own directory on the backup host. This is a standalone Compose file, not an override for the primary stack.
3. Create `.env` in that directory with the shared and node configuration above. All secrets marked required in the Compose file must be present. Set the same image tag as the primary, with the health routes and migration retry included.
4. Validate and start the node:

   ```bash
   docker compose -f docker-compose.node.yml config -q
   docker compose -f docker-compose.node.yml pull
   docker compose -f docker-compose.node.yml up -d
   docker compose -f docker-compose.node.yml ps
   docker compose -f docker-compose.node.yml logs --tail=100 tmcontrolpanel gbx-service
   ```

5. Configure the host's TLS reverse proxy: panel traffic to `127.0.0.1:3000`, browser WebSockets to `127.0.0.1:3100`. Enable WebSocket upgrades. Keep `/internal/*` on port 3100 private. If the proxy itself runs in Docker, attach it to the application network and use the service names instead of host loopback.
6. Verify the node before adding it to the public routing pool.

The web container runs `prisma migrate deploy` on startup. Prisma's database advisory lock serialises concurrent migrations, and startup retries lock contention. Starting both hosts together is supported. Never disable the advisory lock. During version upgrades, use compatible releases and check the changelog before rolling between versions.

## Coolify deployment

1. Add the new host to Coolify and create a separate Docker Compose resource using `docker-compose.coolify.node.yml`. Do not deploy the full stack on the new host.
2. Set the shared variables above as plain environment variables in Coolify. For an existing Coolify primary, copy the resolved secrets from that resource: `SERVICE_BASE64_64_NEXTAUTH` becomes `NEXTAUTH_SECRET`; `SERVICE_PASSWORD_64_SECRETS`, `GBXTOKEN`, `WSTICKET`, `PANELTOKEN` and `HETZNER` supply their corresponding plain variables. Build the shared connection URLs with the existing database and Redis passwords and mesh addresses.
3. Set `GBX_NODE_ID=node-b`, the worker count, lease TTL, image tag and flavour. Set a unique `STACK_NAME` such as `node-b` so proxy aliases do not collide.
4. The file follows `docker-compose.coolify.yml` and uses the external NPM network. Set `NPM_NETWORK` to an existing proxy network on this host (default `nginxproxymanager_default`). Attach the proxy to it before deploying.
5. Assign real HTTPS domains to both services. Coolify's `SERVICE_URL_*` variables generate domain settings only. All shared secrets are required plain variables; no `SERVICE_PASSWORD_*` variables generate replacement secrets in this file.
6. Coolify supplies `NEXTAUTH_URL`, the callback URL and default WSS URL from the assigned domains. For a stable shared WSS endpoint, set `GBX_SERVICE_WS_URL` explicitly. Set `WS_ALLOWED_ORIGINS` to include the stable public panel origin and any host-specific panel origins on both nodes. Register the resulting callback URLs with Nadeo. Set `PANEL_PUBLIC_URL` to the shared panel domain to use it for both instead.
7. Deploy, inspect the logs and run the checks below. Proxy to `tmcontrolpanel-node-b:3000` and `gbx-service-node-b:3100` on the NPM network. Keep GBX `/internal/*` private and enable WebSocket upgrades.

Do not recreate or rotate the primary's generated secrets while adding the node.

## Verify and test failover

On each host, check the front and web health. For Coolify, run these requests inside the containers or through the configured health URLs; the node file does not publish host ports.

```bash
curl -fsS http://127.0.0.1:3100/healthz
curl -fsS http://127.0.0.1:3100/health
curl -fsS http://127.0.0.1:3000/api/health
```

Both `/healthz` endpoints must return 200: Redis is reachable and at least one worker is alive. `/health` includes worker details; use it to inspect workers on each node. `/api/health` checks the database, Redis and that web replica's local GBX `/healthz`. It returns 503 if any check fails. Health does not prove every dedicated server is connected; check the live pages too.

Inspect ownership from a mesh host with `redis-cli` installed. Enter the existing Redis password without putting it in shell history:

```bash
read -rs -p 'Redis password: ' REDISCLI_AUTH
export REDISCLI_AUTH
redis-cli -h 100.64.0.10 --scan --pattern 'gbx:lease:*' |
  while IFS= read -r key; do
    printf '%s ' "$key"
    redis-cli -h 100.64.0.10 --raw GET "$key"
  done
unset REDISCLI_AUTH
```

Use the same Redis database index as `SHARED_REDIS_URI` (`-n <index>` on both commands if not `0`). Values look like `node-b:0.<incarnation>`. Each key has one owner. With enough idle servers, both nodes should own servers. Rebalancing only moves idle servers and runs once per minute; adding a node may not spread busy servers immediately.

Test in a maintenance window with live pages open:

1. Record current lease owners. On the primary, stop only `gbx-service` with `docker compose stop gbx-service` (use its actual Compose file/resource). The 20s stop grace period lets workers release leases. Recheck lease owners, chat and live updates on the backup. Clean handoff normally takes a few seconds; a tested two-node SIGTERM handoff took 1.9s.
2. Restart the primary service. Once it owns servers again, simulate a hard failure with `docker compose kill -s SIGKILL gbx-service`. With the default TTL, allow roughly 20s for expired leases and the next claim pass. Restart it after the check. Do not power off a host that still holds the only database and Redis unless testing that outage intentionally.
3. Verify the surviving node can issue commands for every server. Check recorded matches and in-game chat for duplicates. Test HTTPS and WSS routing separately by removing one application host from the front door.

See [Worker failover](real-server-testing.md#worker-failover) for the automated suite and individual worker crash tests. These commands stop services; they are operational checks, not part of Compose validation.

## Front door

Choose Cloudflare load balancing, DNS failover or a manual switch for the public panel and WSS endpoints. Probe each backend's `/api/health` and the GBX `/healthz` as appropriate. Route both HTTPS and WSS away from a failed host, and allow health probes through the proxy. DNS failover depends on client caches and TTLs.

No sticky sessions are needed. Existing sockets disconnect when their host dies; clients reconnect with a fresh ticket. Keep the public domain and auth secret stable so sign-in works after switching hosts. A Hetzner-only load balancer or floating IP cannot cover the Contabo primary.

## Limits and database placement

A second application host does not make the database or Redis highly available. If either goes down, both application nodes lose service. During takeover, in-memory match state for the current round and in-memory plugin state can be lost. Database-backed plugin storage survives.

The plan has three storage options:

- **A:** keep MariaDB and Redis on the primary. Simple, but losing that host stops both nodes.
- **B:** move MariaDB and Redis to a small third VPS. Either application host can fail independently. The storage VPS remains a single point of failure. Start with this option; follow the [database host guide](database-host.md).
- **C:** MariaDB primary/replica plus Redis Sentinel across three hosts. This needs database failover tooling, client failover configuration and split-brain care. It is separate work; the node files alone do not provide it.

Choose the storage option before claiming host-level availability. Dedicated servers also need their own availability plan; these nodes only move their controllers.
