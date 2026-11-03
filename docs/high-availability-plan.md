# High availability plan: GBX workers, failover and a backup host

Status: phase 1 is implemented. Multi-host deployment remains planned.

## Goals

1. **Isolation.** A crashed or stuck controller only takes down its own dedicated servers. The other servers stay connected and keep recording.
2. **Load spreading.** GBX connections are split over a configurable pool of worker processes, and over several hosts.
3. **Backup host.** A second TMControlPanel deployment on a separate Hetzner VPS. It shares the load all the time (active-active) and takes over the primary's servers when the primary dies.
4. **No double controllers, ever.** At most one process holds the GBX connection to a dedicated server. A gap of a few seconds during failover is acceptable; double records and double chat are not.

Not in scope: browser routing between hosts (reverse proxy or DNS failover is left to the operator, see [Front door](#front-door-operator)), and high availability for the database and Redis themselves (options under [Database and Redis](#database-and-redis)).

## Current state

The front/worker split, Redis leases, RPC, event bus, status cache and health checks are implemented. Several containers sharing the database and Redis already split servers by lease. This is not yet the documented deployment setup.

## Implementation notes

- Worker ids are `<node>:<n>.<incarnation>`, fresh for each process, rather than `<node>:<n>`.
- Workers are forked with Node's `child_process`. The service runs on Node, not Bun.
- `GBX_WORKERS=0` keeps the previous single-process mode as a rollback switch.
- Rebalancing only moves servers without players, once per 60s, when a worker has at least two more servers than the least loaded worker.
- Per-server sockets with no owner stay open. They receive a snapshot once a worker takes the server.
- Compose allows 20s for shutdown so workers can dispose runtimes and release leases.

## Target architecture

```
                 browser (panel + wss)            web replicas (host A, host B)
                        |                                   |
             [operator's proxy / DNS]           GBX_SERVICE_URL (local front)
                        |                                   |
        +---------------+-----------------------------------+--------------+
        |  host A: gbx-service container   |  host B: gbx-service container  |
        |   front (HTTP + WS, no GBX)      |   front (HTTP + WS, no GBX)     |
        |    |-- worker A1  [srv 1, 2]     |    |-- worker B1  [srv 4, 5]    |
        |    |-- worker A2  [srv 3]        |    |-- worker B2  [srv 6]       |
        +-------------------+--------------+-----------------+--------------+
                            |                                |
                         Redis: leases, RPC, event bus, status cache
                         Database: unchanged
```

- **Front process**: the container's main process. It serves the internal HTTP API and the browser WebSockets, starts and supervises the workers, and never opens a GBX connection. It is stateless, so any front can serve any server.
- **Worker process**: holds GBX connections, plugins and match recording for the servers it owns. It has no public port and talks to fronts only through Redis.
- **Redis** carries everything between processes and hosts: ownership leases, command RPC, live events and a status cache. The hosts only need to reach the shared Redis and database, with no direct process-to-process networking.

## Design

### Configuration (gbx-service)

| Variable                      | Default  | Meaning                                                                                          |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `GBX_NODE_ID`                 | hostname | Unique per container; worker ids are `<node>:<n>.<incarnation>`                                  |
| `GBX_WORKERS`                 | `1`      | Worker processes in this container. Set it equal to the server count for one process per server. |
| `GBX_LEASE_TTL_MS`            | `15000`  | Ownership lease lifetime in ms (minimum `6000`). Renewed every TTL/3.                            |
| `GBX_SERVICE_ENABLED_SERVERS` | empty    | Kept: limits which servers this container's workers may claim                                    |

Memory is roughly 80–150 MB per worker, plus the front.

### Process supervision (`main.ts`, new `worker.ts`)

- The front starts `GBX_WORKERS` children (Node `child_process.fork` with IPC) running `worker.ts`. That entry point builds the existing container without the HTTP app.
- Crashed workers are restarted with exponential backoff (1s → 30s).
- When a child exits, the front immediately releases that worker's leases with a compare-and-delete on the worker id. Other workers can then claim those servers without waiting for the TTL.
- On SIGTERM, workers dispose their runtimes and then release their leases, so rolling deploys hand servers over within seconds.
- The IPC channel is only used for health (heartbeat and stuck-loop detection). A worker whose event loop stops answering for 10s is killed, so a blocked plugin can't hold a server hostage.

### Ownership leases (new `core/cluster/ownership.ts`)

- `gbx:lease:<serverId>` = `<workerId>`, claimed with `SET NX PX <ttl>`.
- A Lua script renews the lease only if it still holds the worker's own id (compare-and-extend). Releasing uses compare-and-delete.
- **Fencing rule:** a worker connects to a server only after its claim succeeded. It disposes the runtime as soon as a renewal fails, or when no renewal has succeeded for `TTL - 3s` by its own clock, which covers losing Redis. This guarantees that two controllers never overlap.
- `gbx:worker:<workerId>` heartbeat key with a TTL, used to count live workers.
- **Claim loop** (every 3s, plus right after a `server.created` event): the worker reads the active server ids, honours `GBX_SERVICE_ENABLED_SERVERS`, and computes `fairShare = ceil(servers / liveWorkers)`. It claims unowned servers while it holds fewer than `fairShare`.
- **Rebalancing:** a worker with at least two more servers than the least loaded worker releases one server without players per 60s. This spreads load after adding a host or worker without flapping. Because it is active-active, both hosts carry part of the load all the time.
- The registry keeps its role inside the worker. `add` and `remove` are driven by lease changes instead of `startAll()`.

### Command RPC over Redis (new `core/cluster/rpc.ts`)

- Each worker subscribes to `gbx:rpc:<workerId>`. A front looks up the lease owner, then publishes `{ id, op, serverId, args, replyTo }`, and the worker answers on the front's `gbx:reply:<frontId>`.
- `PUBLISH` returns the number of receivers. When it is 0, the owner is gone: the front looks up the lease again once and retries. That is safe because the command was never delivered. Commands that were delivered are never retried automatically, because they are not idempotent.
- Timeouts mirror the web's `LONG_TIMEOUT_MS` / default. Errors are serialized as `AppError` codes, so the existing HTTP error mapping stays.
- The ops map one-to-one to the existing internal routes (command, reconnect, gbx call/multicall, maps, chat, plugins, points, snapshot and so on). `internal.ts` swaps `registry.get(id).x()` for `cluster.call(id, "x", args)`. A server with no owner returns a new `ServerUnavailable` error (HTTP 503) instead of `ServerNotFound`.

### Event bus (new `core/cluster/event-bus.ts`)

- Workers publish runtime events to `gbx:ev:<serverId>`: the live, map and players channel events that `channels.ts` forwards today.
- They publish registry-level events to `gbx:ev:global`: connect, disconnect, reconnect, adminCommand, owned and released.
- Workers also write a status snapshot (`runtime.status()`) to `gbx:status:<serverId>` on every change, with a TTL tied to the lease. `/internal/servers`, `/ws/servers` and `/ws/clients` read these snapshots, so they cover every server on every host.
- WebSocket channels in the front use ref-counted subscriptions: subscribe to `gbx:ev:<id>` while at least one socket watches the server. On open, the front subscribes first, fetches the initial state (`liveInfo`, `activeMapUid`, `activePlayers`) by RPC, and buffers events until that state arrives, so nothing is lost between the snapshot and the stream.
- When ownership moves, the global channel announces `released` / `owned`. Open per-server sockets stay open and get a fresh snapshot from the new owner, instead of the current "Server removed" close.
- Volume: checkpoints and chat per server are small, and pub/sub only sends to fronts that are subscribed.

### Lifecycle events

- `server.*` events always go out over the Redis channel. The HTTP route on the front stays, but it now publishes to Redis instead of applying the change locally.
- `created` triggers a claim pass, `updated` and `plugins.updated` go to the owner, and `deleted` makes the owner dispose the runtime and release the lease.
- `publishServerEvent` in the web app keeps working unchanged.

### Singletons

- `gbx:singleton:<name>` locks (same lease mechanism):
  - First-party plugin install runs on startup under a lock. Other nodes wait for it to finish (or time out) before their workers load plugins.
  - The marketplace watcher runs only in the front that holds the `marketplace` lease. Its `disable` callback becomes an RPC to the owning worker.

### What is lost on failover

- The time a failover takes: about 3–5s on a worker crash or clean shutdown (leases are released straight away), and up to TTL + claim interval (about 20s) on a host crash or network split.
- In-memory match state for the round in progress. The recorder starts again at the next round or map.
- In-memory plugin state. Plugins reload on the new owner; plugin storage in the database survives.

### Web app

- Run one web replica per host, each pointing `GBX_SERVICE_URL` at its own host's front.
- Startup migrations from two replicas: verify that Prisma's migrate advisory lock serialises them on both MariaDB and PostgreSQL. Otherwise only one host runs them.
- `syncAllMaps()` on startup runs on both replicas. It does the same work twice but does no harm; it can take a singleton lock later.
- Add a `/api/health` route for the operator's proxy.

### Front door (operator)

The application side provides:

- `GET /healthz` on the front: Redis reachable and at least one worker alive. Workers keep holding leases even when the front's health check fails.
- Either host's panel and `wss://` endpoint can serve every server, so any proxy can fail over between hosts: Cloudflare load balancing, DNS failover, or a manual switch. No sticky sessions are needed. Clients already reconnect with a fresh ticket.

## Hetzner backup host

### How it would work

The backup VPS runs the same Coolify stack without `db` and `redis`: web plus `gbx-service` with its own `GBX_NODE_ID`. It points at the shared database and Redis and joins as extra workers.

### Prerequisites and caveats

- **Ordering is blocked right now.** On 2026-11-03, every shared-vCPU plan on hetzner.com (CX, CAX and CPX lines) shows "This product is currently unavailable". Check the Hetzner console for other locations, or look at the Server Auction / dedicated servers or another provider.
- **No shared private network with the primary.** Hetzner private networks only connect Hetzner Cloud servers, so the primary VPS (Contabo) can't join one. Redis, the database and the dedicated servers' XML-RPC ports must not be exposed in plain text on the internet. Run a WireGuard mesh between the hosts (or Tailscale, free tier) and bind Redis and MariaDB to it.
- **Dedicated servers must accept both hosts.** XML-RPC ports and firewalls must let in the primary and the backup. If the dedicated servers run on Hetzner Cloud (as the panel provisions them), put the backup VPS in the same Hetzner private network and reach them privately.
- **Database and Redis stay a single point of failure** while they live on one host, see [Database and Redis](#database-and-redis).
- **Latency:** every panel command adds a Redis round trip, and cross-host live events cross the internet (DE ↔ DE is roughly 5–20 ms). That's fine for this workload.

### Database and Redis

| Option                                                     | Survives the primary dying?                                            | Effort                                    |
| ---------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| A. Keep MariaDB + Redis on the primary                     | No. The backup can't run without them. Isolation (goal 1) still works. | none                                      |
| B. Move MariaDB + Redis to a small third VPS               | Yes, if host A or host B dies; no if the DB VPS dies                   | low                                       |
| C. MariaDB primary/replica + Redis Sentinel across 3 hosts | Yes, any single host                                                   | high (failover tooling, split-brain care) |

Hetzner has no managed MySQL, PostgreSQL or Redis product on its cloud pages, so B and C are self-managed. Recommendation: start with B, and only go to C if the DB host turns out to be the weak spot. Follow the [database host guide](database-host.md) to deploy option B.

### Costs (Hetzner, EUR/month excl. VAT, Germany/Finland, prices include IPv4)

| Item                                                   | Plan                | Price                  |
| ------------------------------------------------------ | ------------------- | ---------------------- |
| Backup host (web + front + 2–3 workers)                | CX23, 2 vCPU / 4 GB | € 5.99                 |
| Backup host, more headroom                             | CX33, 4 vCPU / 8 GB | € 8.99                 |
| Daily backups                                          | +20% of the server  | from € 1.20            |
| DB/Redis VPS (option B)                                | CX23                | € 5.99                 |
| Hetzner load balancer (only works for Hetzner targets) | LB11                | € 7.49                 |
| Floating IPv4 (only moves between Hetzner servers)     |                     | € 3.00                 |
| Private network                                        |                     | no price listed (free) |
| WireGuard / Tailscale                                  |                     | € 0                    |

Totals:

- Backup host only: about €7–11/month.
- Backup host plus a separate DB/Redis VPS (option B): about €14–20/month.
- Full three-node setup (option C): about €20–30/month.

The load balancer and floating IP can't include a non-Hetzner primary.

## Phases

1. **Workers on one host.** Front/worker split, leases, Redis RPC, event bus, status cache, `/healthz`. This delivers goal 1 on the current single VPS, and everything later builds on it.
2. **Several nodes.**
   - [x] `GBX_NODE_ID`, cross-host fair share and rebalancing, singleton locks, clean handoff on shutdown and lifecycle events over Redis.
   - [x] Web `/api/health` checks the database, Redis and the local GBX front.
   - [x] Startup migrations use Prisma's advisory lock and retry lock contention when replicas start together.
3. **Backup deployment.**
   - [x] Node-only stacks: `docker-compose.node.yml` and `docker-compose.coolify.node.yml`.
   - [x] [Backup host guide](backup-host.md), README pointer, mesh and firewall instructions. Worker failover checks are in `docs/real-server-testing.md`.
   - [ ] Order the Hetzner host; check availability.
   - [ ] Set up WireGuard or Tailscale and firewall rules on the real hosts. Verify cross-host takeover there.
   - [ ] Choose database and Redis option A, B or C (recommendation: B, see the [database host guide](database-host.md)).
4. **Optional:** database and Redis HA (option C).

## Testing

- Unit: ownership with a fake Redis and clock (claim, renew, lost renewal disposes, fair share, rebalance cooldown); RPC (no receiver → re-lookup, timeout, error mapping); channel buffering between snapshot and stream.
- Integration against real Redis: two worker processes never own the same server; killing a worker frees its servers within 5s; Redis outage disposes every runtime within the TTL.
- Real server (`docs/real-server-testing.md` additions):
  - `kill -9` one worker → the other servers' live pages keep updating.
  - Stop the whole primary container → the backup takes over within about 20s.
  - Check `Match` rows and chat for duplicates after failover.

## Open questions

- Where do the dedicated servers run (Hetzner Cloud, Contabo, elsewhere), and are their XML-RPC ports reachable from a second host today?
- Does the primary stay on Contabo, or move to Hetzner too? Moving it would make private networks, floating IPs and the LB11 usable.
- Which database option (A, B or C) should phase 3 target?
