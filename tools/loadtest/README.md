# @tmcontrolpanel/loadtest

Load-testing tool for TMControlPanel. Two commands:

- `servers`: N fake dedicated Trackmania servers speaking GBXRemote 2 (real XML-RPC framing, callbacks, mode script events), so the real GBX service connects to them.
- `browsers`: simulated panel users holding live WebSockets to the GBX service, plus optional HTTP load on the web panel.

## Safety: staging only

Never point this at production. `servers` makes the GBX service open real connections and write players, maps and match results to the database it uses. `browsers` signs WebSocket tickets with `WS_TICKET_SECRET`, which is an admin-level secret, and can generate heavy traffic. Use a throwaway staging stack that can absorb the load, and use a dedicated password for the fake servers. The tool never prints the secret or tickets.

## Build and run

```sh
bun install
bun run --filter @tmcontrolpanel/loadtest build      # self-contained tools/loadtest/dist/cli.js (Node 22)
node tools/loadtest/dist/cli.js <servers|browsers> [flags]
```

Every flag can also be set as env `LOADTEST_<FLAG>` (for example `LOADTEST_PASSWORD`). Output is JSON lines: a `stats` line every 10 seconds and a final `summary` on SIGINT, SIGTERM or when `--duration` ends.

## `servers`

| Flag                    | Default   | Meaning                                                           |
| ----------------------- | --------- | ----------------------------------------------------------------- |
| `--count`               | 1         | Number of fake servers (one TCP listener each)                    |
| `--base-port`           | 5000      | Server i listens on base + i                                      |
| `--host`                | 0.0.0.0   | Bind address                                                      |
| `--password`            | loadtest  | Password for `Authenticate` (user `SuperAdmin`); wrong one faults |
| `--players`             | 10        | Simulated players per server (logins `lt-<server>-<n>`)           |
| `--event-rate`          | 0.5       | WayPoints per player per second                                   |
| `--chat-rate`           | 0.1       | Chat lines per second per server                                  |
| `--map-minutes`         | 5         | Minutes per map before EndMap/BeginMap                            |
| `--duration`            | 0         | Seconds to run, 0 = until SIGINT/SIGTERM                          |
| `--seed`                | 1         | Seed for the random simulation                                    |
| `--public-host`         | 127.0.0.1 | Host written by `--print-registrations`                           |
| `--print-registrations` | off       | Print JSON `[{name,host,port,user,password}]` and exit            |

Stats lines report connected controllers, requests/sec (total and top 10 methods), unknown methods, callbacks/sec sent, and chat lines and manialink pages received (count and bytes).

Example:

```sh
node tools/loadtest/dist/cli.js servers --count 20 --base-port 5000 --password staging-pw --players 16 --event-rate 1 --public-host 192.0.2.10
```

### Registering the servers

Run `--print-registrations` with the same `--count`, `--base-port`, `--password` and set `--public-host` to an address the GBX service can reach. Add the entries as servers in the staging panel (name, host, port, user `SuperAdmin`, password), either through the panel UI or by inserting rows with the panel's credential encryption. The GBX service then connects, authenticates, runs its initial sync and receives callbacks.

### Simulated behaviour

Callbacks are only sent after the controller called `EnableCallbacks`; mode script events (`ManiaPlanet.ModeScriptCallbackArray`) also need `XmlRpc.EnableCallbacks`. Players connect and disconnect over time; each runs repeated attempts (`Trackmania.Event.StartLine`, several `WayPoint`, finish, occasional `GiveUp`). Maps rotate (`EndMap_Start`, `Podium_Start`, `Trackmania.Scores`, `EndMap`, `BeginMap`, `StartMap_Start`; `BeginMatch` when the rotation wraps). Script calls with a response id (`Trackmania.GetScores`, `Trackmania.WarmUp.GetStatus`, `Maniaplanet.Pause.GetStatus`, `Maniaplanet.Mode.GetUseTeams`) are answered with a callback carrying the same `responseid`. Unknown methods return an XML-RPC fault (`-1000`, "Unknown method") and are counted.

## `browsers`

| Flag             | Default                                       | Meaning                                                                       |
| ---------------- | --------------------------------------------- | ----------------------------------------------------------------------------- |
| `--browsers`     | 1                                             | Simulated browsers                                                            |
| `--claims`       | required                                      | JSON file with the session claims (below)                                     |
| `--servers-file` | none                                          | JSON array of server ids, assigned round-robin; required for live/map/players |
| `--url`          | `GBX_SERVICE_WS_URL` or `ws://localhost:3100` | GBX service WebSocket base URL                                                |
| `--channels`     | all five                                      | Comma list of `servers,notifications,live,map,players`                        |
| `--origin`       | none                                          | Origin header, needed if the service restricts allowed origins                |
| `--ramp`         | 0                                             | Seconds over which browsers are started                                       |
| `--duration`     | 60                                            | Seconds, 0 = until signal                                                     |
| `--http-url`     | none                                          | Web panel base URL for HTTP load                                              |
| `--http-paths`   | `/api/health,/login`                          | Comma list, cycled                                                            |
| `--http-rps`     | 0                                             | Total HTTP requests/sec across all paths                                      |

Env: `WS_TICKET_SECRET` (required, must equal the service's secret), `LOADTEST_COOKIE` (optional `Cookie` header for HTTP requests).

Each browser opens the sockets the web app opens: `/ws/servers` and `/ws/notifications` plus `/ws/live/<id>`, `/ws/map/<id>` and `/ws/players/<id>` for its server. There is no subscribe message; the channel is the path and the ticket goes in `?ticket=`. A fresh ticket is signed per connection and per reconnect. Reconnects follow the web app (backoff, immediate on 4001, none on 4403, limited on 4404). Stats include messages/sec, bytes/sec, reconnects, close codes, errors and inter-arrival p50/p95/p99 (messages carry no server timestamp). HTTP stats include rps, status counts and p50/p95/p99 latency.

Note: the service rate-limits WebSocket upgrades to 120 per minute per IP, so a large `--browsers` with a short `--ramp` from one machine gets 429s. Use a long ramp or raise the limit on staging.

### Claims JSON

An object accepted by `sessionClaimsSchema` (see `packages/shared/src/permissions.ts`). It decides which channels succeed (`players` needs moderator, `live` and `map` need view access). Example for an admin:

```json
{
  "id": "loadtest-user",
  "login": "loadtest",
  "displayName": "Load Test",
  "admin": true,
  "permissions": [],
  "servers": [],
  "groups": [],
  "adminGroups": []
}
```

Example run:

```sh
echo '["<server-id-1>","<server-id-2>"]' > ids.json
WS_TICKET_SECRET=... node tools/loadtest/dist/cli.js browsers --claims claims.json --servers-file ids.json \
  --url wss://staging-gbx.example --browsers 100 --ramp 60 --duration 300 \
  --http-url https://staging.example --http-rps 20
```

## Development

```sh
node_modules/.bin/tsc --noEmit -p tools/loadtest/tsconfig.json
bun run --filter @tmcontrolpanel/loadtest test
```
