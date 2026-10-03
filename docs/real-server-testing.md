# Real server test plan: GBX service

Goal: prove the GBX service behaves like the current web app against a real Trackmania dedicated server before phase 4 (web cut-over) starts. The automated suites already cover logic with fakes. This plan covers what fakes can't:

- real XML-RPC encoding;
- real callback payloads, order and timing;
- manialinks rendering in the game client;
- the Nadeo APIs;
- behaviour over long sessions and reconnects.

Each test has an ID so results can be logged in the table at the end.

## 1. Setup

### Prerequisites

- A dedicated server account (login + password from https://www.trackmania.com/player/dedicated-servers).
- A Trackmania client (your own account) to join the server. Fake players cover the rest.
- Docker, Bun, `jq`.
- Optional: Nadeo API credentials (server account + OAuth client) for world records, personal bests and map metadata.

### Isolation

The e2e stack has its own dedicated server, MariaDB and Redis on separate ports (`5010`, `53307`, `56380`, game port `2350`), and the service runs on `3101`. **Don't** point the web app at the e2e database while the service is running: the web app connects every server in its database, and two controllers on one dedicated server produce double records and double chat. The service is additionally pinned to the e2e server with `GBX_SERVICE_ENABLED_SERVERS=e2e-server`.

If port `2350` is taken (another dedicated server), set `E2E_GAME_PORT`.

### Bring-up

```bash
cd apps/gbx-service
cp e2e/.env.example e2e/.env       # fill in TM_MASTERSERVER_*, E2E_ADMIN_LOGIN, optional NADEO_*
bun run e2e:up                     # dedicated server + MariaDB + Redis
bun run e2e:migrate                # web app migrations, incl. the plugin rows
bun run e2e:seed                   # server row, your admin user, all plugins enabled
bun run e2e:dev                    # the service, pretty logs, reloads on change
```

`e2e:seed` prints your admin user id; keep it for the notifications channel. Set `E2E_PLUGINS=map-info,live-round` to enable a subset (re-run the seed, then publish `server.plugins.updated`, see below).

### Observation tools

```bash
# Live socket output, one line per message (add --full for raw JSON)
bun run ws:watch live          # also: map, players, servers, clients
bun run ws:watch notifications --user <admin user id>

# Internal API
export GCP=http://localhost:3101/internal/servers/e2e-server
gcp() { curl -s -H "Authorization: Bearer e2e-service-token-0123456789abcdefghij" -H "Content-Type: application/json" "$@" | jq; }
gcp $GCP/live
gcp -X POST $GCP/gbx/call -d '{"method":"GetPlayerList","params":[100,0]}'

# Database and Redis
dce() { docker compose --env-file e2e/.env -f e2e/docker-compose.yml "$@"; }
dce exec db mariadb -ugcp -pgcp gcp_e2e -e "select login, round, time, points, matchId from records order by createdAt desc limit 10"
dce exec redis redis-cli lrange jukebox:e2e-server 0 -1

# Lifecycle events, as the web app will publish them
dce exec redis redis-cli publish gcp:server-events '{"type":"server.plugins.updated","serverId":"e2e-server"}'
```

Join the server from the game with `#qjoin=<server login>@Trackmania` (the login is in `gcp -X POST $GCP/gbx/call -d '{"method":"GetMainServerPlayerInfo"}'`) or through the server browser.

Fake players: `gcp -X POST $GCP/gbx/call -d '{"method":"ConnectFakePlayer"}'`. They join and spectate, but never drive.

## 2. Connection lifecycle

| ID | Steps | Expected |
|---|---|---|
| C1 | Start the service with the dedicated server up | Log `Connected to GBX server`; `/ws/servers` shows `isConnected: true`; a `maps` row for the current map and a `matches` row exist |
| C2 | `dce restart dedicated` | `disconnect` on `/ws/servers` and `/ws/clients`, `reconnect try` with a timestamp ~15 s ahead, then `connect`; widgets reappear in game without restarting the client |
| C3 | `dce stop dedicated` while the service is connected, wait ~2.5 min (10 × 15 s) | Ten retries, then `reconnect stop` on `/ws/clients`; `isReconnecting: false`; no further attempts in the log |
| C4 | After C3: `dce start dedicated`, then `gcp -X POST $GCP/reconnect` | `{ "connected": true }` |
| C5 | `gcp -X POST $GCP/disconnect` | Disconnects and **stays** offline (no retries); widgets disappear in game; `POST $GCP/reconnect` brings it back |
| C6 | `gcp -X POST $GCP/stop-reconnect` while retries are pending (during C3) | `reconnect stop`, no more attempts |
| C7 | Change `password` of the server row in MariaDB, publish `server.updated` | Reconnects with the new password, fails authentication and retries; restore the password and publish again → connected |
| C8 | Stop the service with Ctrl+C mid-match and start it again | Clean shutdown log; after restart all widgets are drawn again for players already on the server |
| C9 | `docker kill` the dedicated server while a player is driving | Same as C2; no unhandled errors, service keeps running |
| C10 | Start the service with the dedicated server down, start the dedicated server ~5 min later | Service starts and serves `/health` (regression test for the ECONNREFUSED crash); it never connected, so it retries for 15 min (15 s apart, then every minute) and connects once the server is up |

## 3. Live state and sockets

Run with yourself on the server and `ws:watch live` / `players` / `map` open.

| ID | Steps | Expected |
|---|---|---|
| L1 | Join the server | `/ws/players`: `playerConnect` with your nickname; `/ws/live`: `playerConnect`; a `users` row for your login |
| L2 | Spectate / play (switch with the in-game button) | `playerInfo` + `playerInfoChanged`; you leave and re-enter the active round |
| L3 | Leave the server | `playerDisconnect` on both channels; `liveInfo.players[<you>].connected === false` |
| L4 | Time attack: drive checkpoints and finish | `checkpoint` events with increasing `cp`; `finish`; `personalBest` on improvement only; one `records` row per finish with `round = NULL` |
| L5 | Switch to rounds: `gcp -X POST $GCP/script -d '{"script":"Trackmania/TM_Rounds_Online.Script.txt"}'` then `gcp -X POST $GCP/gbx/call -d '{"method":"NextMap"}'` | On the next match: `modeChange` in the log, TA plugins unload, round plugins load; `liveInfo.type === "rounds"` |
| L6 | Rounds: play 3 rounds (finish, give up, finish) | `beginRound` per round; `roundNumber` 1, 2, 3 in `records.round`; `giveUp` sets `hasGivenUp`; `endRound` carries match points |
| L7 | Rounds with warm-up (`S_WarmUpNb: 1` via script settings) | `warmUpStart` / `warmUpStartRound` / `warmUpEnd`; **no** records during warm-up; round counting starts after warm-up |
| L8 | Pause: `gcp -X POST $GCP/pause -d '{"paused":true}'`, wait, unpause | `isPaused` true then false; the paused round is not counted twice (check `records.round`) |
| L9 | `NextMap` | `endMap` / `beginMap` / `startMap` on `/ws/live` and `/ws/map`; new `maps` row with Nadeo metadata when credentials are set |
| L10 | Change script settings: `gcp -X PUT $GCP/script-settings -d '{"settings":{"S_PointsLimit":30}}'` | `updatedSettings` with `limit=30` |
| L11 | Cup / reverse cup / knockout / teams (one map each) | Correct `type`; finalist/eliminated flags and team points on `endRound`; elimination events in knockout |
| L12 | `GET $GCP/live` at any point | Snapshot matches what the sockets showed |

## 4. Commands and passthrough

| ID | Steps | Expected |
|---|---|---|
| A1 | `gcp -X POST $GCP/chat -d '{"message":"hello"}'` and with `"login":"<you>"` | Broadcast / private message in game |
| A2 | Configure all chat templates in MariaDB (`servers.scriptNameChangeMessage` etc.), restart the service, run script change, match settings load, settings save, add/remove/reorder maps | Each action posts its template once; map names are stripped of `$` codes |
| A3 | `POST $GCP/maps` with one valid file, one missing file, then two files | Single add returns `{count:1}`; a missing single file returns 502 with the server's error; batch returns the added count |
| A4 | `POST $GCP/maps/remove` with every map in the list | 409 `RemoveLastMapError`, nothing removed |
| A5 | `PUT $GCP/maps/order` | Order changed in game (`GetMapList`) |
| A6 | Player and team points (round/map/match) on a rounds/teams map | Points change on the scoreboard; `playerUpdated` / `teamUpdated` on `/ws/live`; map points don't alter round points |
| A7 | `POST $GCP/gbx/call` with `StopServer` | 403 `MethodNotAllowed` |
| A8 | `PUT $GCP/chat-config` with `manualRouting: true` and a `messageFormat` | Chat from players is re-sent in the format; `/help` still answers |
| A9 | Fake players: connect 3, kick one, ban/unban, guest list add/remove via passthrough | Same results as from the old panel |
| A10 | Jukebox: `dce exec redis redis-cli rpush jukebox:e2e-server '{"fileName":"<file of another map>"}'`, finish the map | That map is next; the entry is popped |

## 5. In-game plugins

Check each widget visually in the game client. Compare with screenshots from the old app (section 8).

| ID | Plugin | Steps | Expected |
|---|---|---|---|
| P1 | map-info | Join, change map | Name/author shown, hidden while driving, updates on map change |
| P2 | records-info | Drive faster than the local record | LR updates live; WR shows the Nadeo holder (with credentials) |
| P3 | player-info | Configure `playerInfos` (device/camera) for your login in `server_plugins.config`, publish `server.plugins.updated` | Card shows device/camera, PB and LR; updates without reconnecting |
| P4 | ta-leaderboard | TA: finish twice (slower then faster) | First finish appears immediately; better time replaces it; players without a time are listed last |
| P5 | ta-active-runs | TA: drive, respawn, give up | Rows move by checkpoint; finished runs drop to the bottom; reset on give-up |
| P6 | live-ranking | Rounds: several rounds | Ranking by match points; spectators with 0 points hidden |
| P7 | live-round | Rounds: you + fake players | Live splits; points per finish from the repartition; LR/WR badge only on the leading finish; `showPoints: false` hides points |
| P8 | admin | Click the help button and `/admin need help` | `/ws/notifications` shows the notification for your user; rows in `notifications`; "Admins have been notified" in chat |
| P9 | match | `/pickban` with order `b:1,p:1,r` and players `[{login: you, seed: 1}]`, ban then pick by clicking, wait for random | Widget updates per step; completes with "match is ready"; `/matchstart` loads exactly the picked maps |
| P10 | match | Same with `choosePosition: true` and `timeout: 20`, let a turn time out | Position window works; timeout picks/bans randomly and announces it |
| P11 | match | Order starting with `r` | Random step runs without anyone clicking (fixed bug) |
| P12 | match | `/pause`, `/unpause`, `/lobby`, `/matchstop`, `/setseeds 2 1`; also as a non-admin | Admin: works and announces; non-admin: "not authorized" |
| P13 | ecm | Open with `/ecm` and the action-group button; toggle recording, save an API key, change the round offset; as a non-editor (second account if available) | Config persisted in `server_plugins.config`; non-editors can't change it; with a real ECM key: finishes and rounds arrive in eCircuitMania |
| P14 | all | Disable a plugin in `server_plugins`, publish `server.plugins.updated` | Its widgets disappear immediately, its commands stop answering |
| P15 | all | `gcp -X POST $GCP/plugins/reload` and `POST $GCP/manialinks/resend` | Widgets redraw; nothing duplicated |
| P16 | help | `/help`, `/help match`, then set `enableHelpCommand` false + `server.updated` | Plugin list and text; silent when disabled |

## 6. Resilience

| ID | Steps | Expected |
|---|---|---|
| R1 | `dce stop db` during rounds, finish a few times, `dce start db` | Errors logged for records/players, service and sockets keep working; records resume after the database is back |
| R2 | `dce stop redis` during a match | Jukebox and Nadeo token cache errors logged; live state and sockets unaffected; recovers when Redis is back |
| R3 | Remove the `NADEO_*` values and restart | Everything works except WR/PB/metadata; widgets show `-`/0 |
| R4 | Malformed lifecycle message: `redis-cli publish gcp:server-events 'nope'` | Warning logged, nothing else |
| R4b | Break the HTTP route: set the web app's `GBX_SERVICE_URL` to a dead port, restart it, then toggle a plugin or delete a server | Web log: `GBX service request failed, event delivered over Redis instead`; the service still applies the change |
| R5 | Open 20 `ws:watch live` sockets and close them, ten times over | Service memory (`ps -o rss -p <pid>`) returns to its baseline; no errors logged |
| R6 | Soak: 1 h with fake players and some driving, plus 20 dedicated-server restarts (`for i in $(seq 20); do dce restart dedicated; sleep 40; done`) | Memory of the service process stable (`ps -o rss`), one callback handler per session, records counted once per finish |

## 7. Security checks

| ID | Steps | Expected |
|---|---|---|
| S1 | Internal routes without/with a wrong token | 401 |
| S2 | WebSocket without ticket, with an expired one (> 60 s old), reused ticket | Closed with 4401 |
| S3 | `WS_ALLOWED_ORIGINS=http://localhost:3000`, connect from a different origin (`websocat -H 'Origin: http://evil' ...`) | Closed with 4403 |
| S4 | Ticket for a user without access to the server on `/ws/live/e2e-server`; non-moderator on `/ws/players/e2e-server` | Closed with 4403 |

## 8. Parity with the current web app

The service must match the old behaviour apart from the fixed bugs listed in `backend-split-requirements.md`. Run the same scenario once with the old app and once with the service, **never both at the same time**:

The old web app only exists up to `refactor/monorepo-gbx-service`; `refactor/web-gbx-cutover` removes it. Check out that branch for step 1.

1. Stop the service. Temporarily point `DATABASE_URL` and `REDIS_URI` in the root `.env` at the e2e stack (`mysql://gcp:gcp@localhost:53307/gcp_e2e`, `redis://localhost:56380`) and run `bun run dev` from the repo root. The web app connects to `e2e-server` itself. Restore the `.env` afterwards.
2. Play the scenario below; screenshot every widget; save the live dashboard's WebSocket frames (browser devtools → Network → WS → copy messages).
3. Note the `matches`/`records` rows (`select round, count(*) from records where matchId = ... group by round`).
4. Stop the web app and start the service (`bun run e2e:dev`), then repeat with `ws:watch live --full > service-live.log`.

Scenario (rounds, points limit 30, 1 warm-up round): warm-up, 3 rounds with one finish and one give-up, pause/unpause in round 2, change script settings, next map, admin chat message, `/admin` notification.

Compare:

- the record rows per round;
- the sequence and payload shapes of the socket messages;
- the widget screenshots;
- the chat output.

Known intentional differences: map points no longer overwrite round points, the TA leaderboard ordering, and window close behaviour.

## 9. Web app against the service

From `refactor/web-gbx-cutover` on, the web app has no GBX connections of its own and talks to the service, so it can run against the e2e stack next to it. Copy the root `.env` to `.env.e2e` (gitignored), remove the keys below from the copy and append:

```bash
DB=mysql
DATABASE_URL=mysql://gcp:gcp@localhost:53307/gcp_e2e
REDIS_URI=redis://localhost:56380
GBX_SERVICE_URL=http://localhost:3101
GBX_SERVICE_WS_URL=ws://localhost:3101
GBX_SERVICE_TOKEN=e2e-service-token-0123456789abcdefghij
WS_TICKET_SECRET=e2e-ticket-secret-0123456789abcdefghij
```

Keep `DEFAULT_ADMINS` with your login: your first login then turns the seeded user into a panel admin, which W12 and W13 need. Run the web app next to `bun run e2e:dev`:

```bash
bun --env-file=.env.e2e run generate                    # MySQL Prisma client
bun --env-file=.env.e2e run --filter @gcp/web dev       # http://localhost:3000
```

Log in with the account from `E2E_ADMIN_LOGIN` and keep the browser devtools open on Network → WS.

| ID | Steps | Expected |
|---|---|---|
| W1 | Open the panel | Sidebar lists `e2e-server` as connected; sockets go to `ws://localhost:3101/ws/...?ticket=...`; `/api/ws-ticket` returns 200 |
| W2 | `dce restart dedicated` with the server page and `/admin/servers` open | Sidebar and client card go offline, show the reconnect countdown, and come back without a page reload |
| W3 | Stop `e2e:dev` for ~20 s, then start it again | Sockets retry with growing intervals (1 s, 2 s, 4 s, ...) and resync on reconnect; actions in between show "GBX service is unavailable" |
| W4 | Live page while driving (TA and rounds); set round/match points for a player and a team | Same updates as `ws:watch live`; points change on the scoreboard and in the dashboard |
| W5 | Players page: list, kick, ban/unban, black list and guest list add/remove/load/save/clean, force spectator | Same results as A9; audit log rows written |
| W6 | Maps page: add a local map, add several, remove one, remove all (expect an error), reorder, jump to a map, restart, next map | Matches A3–A5; "Cannot remove the last map from the server" shown as an error; map list chat template posted once per change |
| W7 | Jukebox: queue a map, finish the current one | Queued map is played next and leaves the jukebox (A10) |
| W8 | Game page: change script, load and save match settings, append/insert playlist, save script settings, pause/unpause from the live page | Chat templates posted once; `updatedSettings` arrives; paused round not counted twice (L8) |
| W9 | Settings page: change server options, rates and toggles; turn the help command off | Values read back after a reload; `/help` stays silent without a service restart |
| W10 | Chat config: enable manual routing with a message format; also save once with the dedicated server stopped | Player chat is re-sent in the format; the stopped-server save stores `manualRouting: false` and shows the error |
| W11 | Plugins page: disable a plugin, change a plugin config, reload plugins | Widget disappears or updates immediately; no restart needed (P14, P15) |
| W12 | `/admin/servers`: stop reconnect during retries, reconnect, resend manialinks, disconnect | Same as C3–C6, triggered from the UI |
| W13 | Edit the server: rename it; then set a wrong XML-RPC password and save; then restore it | Service logs `server.updated` each time; the new name shows on `/admin/servers` (the sidebar takes names from the session, so after the next session refresh); the wrong password disconnects and retries (C7); restoring it reconnects |
| W14 | Advanced page: connect and disconnect a fake player, copy the join link; send a chat message from the live page, public and to one player | Works as before; message prefixed with your role and name |
| W15 | Click the admin help button in game | Notification toast in the panel (P8) |

## 10. Exit criteria for phase 4

- All of sections 2–7 pass, or have an accepted issue linked in the results log.
- The parity run shows no unexplained difference.
- The R6 soak shows stable memory and no duplicate records.
- Every bug found has a regression test in `apps/gbx-service/test`.

## 11. Results log

Copy per test run.

| ID | Date | Mode / map | Result | Notes / issue |
|---|---|---|---|---|
| C1 | | | | |
