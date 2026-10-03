# Backend split: requirements

Goal: move every GBX (XML-RPC) connection, the in-game plugin system and the realtime WebSockets out of the Next.js app into a separate long-running service ("GBX service"). Next.js keeps the UI, auth, database/Nadeo/TMX/Hetzner/filemanager logic. All Server Actions (`src/actions/**`) are replaced with real HTTP API endpoints.

Requirement IDs (`GS-*` for the GBX service, `NX-*` for Next.js, `X-*` cross-cutting) are there so you can track them in issues.

---

## 0. Ownership after the split

| Concern | Today | After |
|---|---|---|
| GBX connections, reconnects, callbacks | `src/lib/managers/gbxclient-manager.ts` | GBX service |
| Live state (`ServerClientInfo`, `liveInfo`, round/match tracking) | in-memory `appGlobals.gbxClients` | GBX service |
| In-game plugins + manialinks + chat commands | `src/plugins/**`, `plugin-manager.ts`, `manialink-manager.ts`, `src/lib/manialink/**` | GBX service |
| WebSockets (`/api/ws/*`) | `next-ws` + custom `src/server.ts` | GBX service |
| Match/record/player/map writes triggered by game events | `src/actions/database/server-only/gbx.ts` | GBX service |
| UI CRUD on DB (users, groups, roles, servers, matches, records, audit logs...) | Server Actions | Next.js API routes |
| Nadeo / TMX / Hetzner / filemanager proxies | Server Actions | Next.js API routes |
| Prisma schema + migrations | Next.js | Next.js stays the owner (see X-3) |
| Auth (next-auth, Ubisoft OAuth) | Next.js | Next.js |

After the split, Next.js should be a stock Next app: no `src/server.ts`, no `next-ws`, no `prepare: next-ws patch`, no `appGlobals.gbxClients`.

---

## 1. Cross-cutting

- **X-1 Deployment.** New container in `docker-compose.yml` (and both the mysql and postgres image variants). Needs network access to every dedicated server's XML-RPC port, plus Redis and the database. Next.js no longer needs to reach the dedicated servers.
- **X-2 Single instance per server.** Only one process may hold the GBX connection for a given server. The plugins, round counter, jukebox pop and record saving all assume one owner. Either run one replica, or add leader election or sharding. Treat "one replica" as a documented constraint for v1.
- **X-3 Shared database schema.** The GBX service writes to `users`, `maps`, `matches`, `records`, `notifications` and `server_plugins`, and reads `servers`, `server_plugins`, `plugins`, `user_servers`, `group_*` (see GS-30). It must support **both MySQL and Postgres** like today (`DB` env var, `src/lib/prisma/{mysql,postgres}`). Pull the Prisma schema into a shared package/workspace so both apps generate from the same file. Next.js keeps running migrations (`start.sh`), and the GBX service must not run them.
- **X-4 Shared Redis key contract.** Both apps use the same Redis. Keys crossing the boundary must be documented and versioned:
  - `active-map:{serverId}`: written by the GBX service (syncMap), read by match/record saving.
  - `jukebox:{serverId}`: written by Next (jukebox endpoints), **popped by the GBX service** on `Podium_Start`.
  - `{serverId}:manialinks:public`, `{serverId}:manialinks:player:{login}`: GBX service only.
  - `nadeo:tokens:{audience}`, `nadeo:credentials_token`, `nadeo:account-names`: shared Nadeo token/name cache if both apps call Nadeo (see GS-33).
  - Redis rate-limiter buckets (`src/lib/ratelimiter.ts`): shared if both apps call Nadeo.
- **X-5 Service-to-service auth.** Next → GBX service calls use a shared secret (env `GBX_SERVICE_TOKEN` or mTLS). The command API must never be reachable from browsers directly.
- **X-6 Error contract.** Keep the `{ data, error }` `ServerResponse` shape (or switch both sides to HTTP status + `{ error, code }`). `ServerError` codes like `GBXConnectionError` and `RemoveLastMapError` should survive the hop so the UI can still toast the right message.
- **X-7 Logging/observability.** Same pino logger shape (`meta: { type, module, function }`, per-server child logger via `getLogger(serverId)`), same `LOG_LEVEL`. Sentry for both apps (`src/lib/sentry/**`, sanitization included).
- **X-8 Config.** The GBX service needs: `DATABASE_URL`, `DB`, `REDIS_URI`, `NEXTAUTH_SECRET` (only if it decodes session JWTs, see GS-40), Nadeo server credentials + `NADEO_CONTACT` (only if it calls Nadeo directly), `LOG_LEVEL`, Sentry DSN, the service token, and the listen port.

---

## 2. GBX service: connection management

- **GS-1 Boot.** On start, load all non-deleted servers (`getAllServers`) and create and connect a manager for each (currently `src/instrumentation.ts`).
- **GS-2 Connect sequence**, in this order:
  1. Load server row with `serverPlugins.plugin`.
  2. TCP connect to `host:port` with a 3 s timeout.
  3. `Authenticate(user, password)`.
  4. `SetApiVersion("2023-04-24")`, `EnableCallbacks(true)`, script `XmlRpc.EnableCallbacks "true"`, script `Trackmania.Event.SetCurRaceCheckpointsMode "always"`.
  5. `ChatEnableManualRouting(server.manualRouting)`; cache chat config (`manualRouting`, `messageFormat`, `connect/disconnectMessage`, `scriptNameChange/matchSettingsLoaded/scriptSettingsSaved/mapListChangeMessage`) and `enableHelpCommand`.
  6. Register callback listener.
  7. `syncMap` → `syncLiveInfo` (GS-12).
  8. Delete all stored manialinks for the server in Redis.
  9. Load + start plugins.
- **GS-3 Reconnect policy.** On disconnect: unload plugins, emit `disconnect`, schedule a retry. 15 s delay, max 10 retries, retry count resets on success, no double scheduling. A server that has never connected (a cloud VM that is still booting) keeps retrying every minute after those retries, until 15 minutes after its first attempt; a manual reconnect starts a new window. Expose `reconnectAt` (epoch ms) for the clients view.
- **GS-4 Manual controls** (backs `src/actions/gbx/clients.ts`): stop reconnecting, trigger reconnect now, resend all manialinks, disconnect client.
- **GS-5 Server lifecycle hooks.** The service must react when Next changes a server:
  - created → create and connect a manager (today this happens lazily, on the next WS open);
  - updated (host/port/user/password) → reconnect with the new credentials, compared with the details of the last connection attempt, so fixing a wrong password also works for a server that never connected. Other edits (name, help command) never touch the connection: a manual disconnect or stopped retries survive them. The reconnect runs in the background, so the web action does not wait for the game server;
  - deleted (soft delete) → stop reconnect, remove listeners, drop the manager;
  - chat config updated → `ChatEnableManualRouting` + refresh the cached chat config. If the GBX call fails, force `manualRouting=false` and still persist (current behaviour);
  - plugins enabled/disabled/config changed → refresh `info.plugins` and run `updatePlugins()`;
  - plugins "reload" → `reloadPlugins()`.

  Do this either through explicit internal endpoints that Next calls after its DB write, or through a Redis pub/sub channel (`gcp:server-events`). Pub/sub is better because Next doesn't need to know whether the service is up.
- **GS-6 Status queries.** Per server: `isConnected`, `isReconnecting`, `reconnectAt`, `serverName`. List all managers (for `/clients`).

## 3. GBX service: event processing and live state

- **GS-10 Callbacks handled** (must keep exact semantics of `callbackListener`):
  - `ManiaPlanet.PlayerConnect/PlayerDisconnect/PlayerInfoChanged/BeginMap/EndMap/BeginMatch/Echo/PlayerChat/PlayerManialinkPageAnswer`
  - `ModeScriptCallbackArray`: `Maniaplanet.Podium_Start`, `Trackmania.Event.WayPoint` (split finish vs checkpoint on `isendrace`), `Maniaplanet.EndMap_Start`, `Maniaplanet.StartMap_Start`, `Maniaplanet.StartRound_Start`, `Trackmania.Scores` (+ `EndRound` / `PreEndRound` sections), `Trackmania.WarmUp.Status/Start/End/StartRound`, `Maniaplanet.Pause.Status`, `Trackmania.Event.GiveUp/SkipOutro/StartLine`, `Trackmania.Knockout.Elimination`.
  - Script responses filtered on `responseid === "gocontrolpanel"` for Scores, WarmUp.Status, Pause.Status.
- **GS-11 Live state model.** Port `ServerClientInfo` 1:1: `activePlayers`, `activeMap`, `chat`, `enableHelpCommand`, `plugins`, and `liveInfo` (`maps`, `players`, `activeRound.players`, `teams`, `isWarmUp`, `warmUpRound`, `warmUpTotalRounds`, `mode`, `type`, `currentMap`, `pointsLimit`, `roundsLimit`, `mapLimit`, `nbWinners`, `pointsRepartition`, `pointsRepartitionMap`, `fastForwardPointsRepartition`, `pauseAvailable`, `isPaused`), plus `currentMatchId`, `roundNumber`, `modeChanged`.
- **GS-12 syncLiveInfo.** Player list sync, warm-up status, script name → mode **type** detection (`timeattack, rounds, reversecup, cup, tmwc, tmwt, teams, knockout`, fallback `rounds`, order matters: `reversecup` before `cup`), `modeChange` emit, create match, current map, script settings parsing (GS-13), map list, request scores + pause status.
- **GS-13 Script settings parsing.** Per-mode variable mapping (`S_PointsLimit` / `S_MapPointsLimit`, `S_MapsPerMatch` / `S_MatchPointsLimit`, `S_PointsRepartition` / `S_EliminatedPlayersNbRanks`), `S_ComplexPointsRepartition` JSON for reverse cup, `S_FastForwardPointsRepartition`, teams-mode auto repartition from `S_MaxPointsPerRound` + ranking size. Re-run on `Echo("UpdatedSettings")`.
- **GS-14 Round tracking.** `roundNumber`: `null` in TA, `0` at map start otherwise, ++ on StartRound outside warm-up, -- when pause toggles, `0 → 1` coercion when saving. Reverse cup helpers (`reverseCupGetPlayerStatus`, `reverseCupGetPointsRepartition`), finalist/lastChance/eliminated/winner flags.
- **GS-15 Internal event bus.** Keep an event emitter (or equivalent) with the current event names, because plugins and WS fan-out both subscribe to it: `connect, disconnect, reconnect, playerConnect, playerConnectInfo, playerDisconnect, playerDisconnectInfo, playerInfo, playerInfoChanged, playerList, playerChat, beginMap, endMap, startMap, beginMatch, startRound, beginRound, endRound, live-endRound, scores, checkpoint, live-checkpoint, finish, live-finish, personalBest, giveUp, live-giveUp, startLine, skipOutro, warmUpStart, warmUpEnd, warmUpStartRound, updatedSettings, elimination, modeChange, playerUpdated, teamUpdated, adminCommand`.

## 4. GBX service: persistence it does itself

These happen on game events with no user in the loop, so they belong in the service:

- **GS-20** Upsert players on connect (`syncPlayers` on full list, `syncPlayer` on PlayerConnect).
- **GS-21** `syncMap`: on BeginMap/connect, `GetCurrentMapInfo` → create `maps` row if unknown → write `active-map:{serverId}` to Redis.
- **GS-22** Create a `matches` row on connect and every BeginMatch (uses `active-map` from Redis).
- **GS-23** Save a record on every finish when not in warm-up/pause (`saveMatchRecord`, upsert on `matchId+login+round`).
- **GS-24** Save round records on `Scores` / `PreEndRound` when not in warm-up/pause (`saveRoundRecords`).
- **GS-25** Jukebox: on `Podium_Start`, read head of `jukebox:{serverId}`, `ChooseNextMap(fileName)`, then `LPOP`.
- **GS-26** Notifications: `/admin` command and its manialink action create `notifications` rows for the server's admins and then push them over WS (GS-44).
- **GS-27** ECM window writes `server_plugins.config` (`isRecording`, `apiKey`) from inside the game. Next must not assume it is the only writer of plugin config.

## 5. GBX service: data it needs from DB / Nadeo / external APIs

- **GS-30 DB reads.** Server connection/chat/plugin config; local record (`getLocalRecord`) and player records (`getPlayerRecords`) for live-round / records-info / player-info; maps by uid and by file name (map-info, match plugin); server admins for notifications.
- **GS-31 Recommendation:** the GBX service talks to the DB and Redis **directly** through the shared Prisma client (X-3). Calling back into Next for every checkpoint/finish would add latency and make record saving depend on Next being up.
- **GS-32 Nadeo API** used by plugins: `getMapLeaderboard`, `getMapRecordsByAccounts`, `getAccountNames`. Either share `src/lib/api/nadeo.ts` + the Redis token cache (needs Nadeo server creds in the service), or expose internal Next endpoints for these three. Sharing the module is simpler, but the in-process `authenticateInFlight` dedupe then won't span both apps (harmless double auth).
- **GS-33 eCircuitMania API** (`src/lib/api/ecm.ts`, `axiosECM`): `match-addRoundTime`, round end. Service only.

## 6. GBX service: plugins, manialinks, chat

- **GS-40 Plugin framework.** Port `Plugin` base class + `PluginManager` semantics:
  - plugin enabled iff a `server_plugins` row exists with `enabled=true`;
  - gamemode filter (`static gamemodes`); empty means all modes;
  - `onLoad / onStart / onUnload / onConfigUpdate`, `setConfig`, `setDbPluginId`;
  - `loadPlugins`, `updatePlugins(updateConfigs)`, `reloadPlugins`, `unloadPlugins`, mode-change re-evaluation;
  - `/help` + `/help <plugin>` (gated by `enableHelpCommand`) using `pluginId` + `helpText`.
- **GS-41 Plugins to port** (with their current ids, which the `plugins` table rows reference by `name`):
  - `ta-leaderboard` (TA), `ta-active-runs` (TA), `live-ranking` (rounds/cup/reversecup/teams), `live-round` (rounds/cup/reversecup/teams), `map-info`, `records-info`, `player-info`, `ecm`, `admin` (notify-admin), `match` (pick & ban, lobby, seeds, pause; commands `/matchstart /matchstop /pause /unpause /pickban /lobby /setseeds`).
  - Config types in `src/types/plugins/*` are the contract with the Next plugin-config forms.
- **GS-42 Manialink system.**
  - Handlebars templates in `src/lib/manialink/templates/**` + `handlebars-layouts`, precompiled by `build:templates`. This build step moves to the service.
  - `Manialink / Widget / Window / ActionGroup` components.
  - `ManialinkManager`: display/hide/destroy per login or public, persisted in Redis, **re-sent to a player on connect**, per-player cleanup on disconnect, wipe on (re)connect.
  - Action routing: `onAction(pattern)` supports `{param}` placeholders matched against `PlayerManialinkPageAnswer.Answer`.
- **GS-43 Chat handling.**
  - Commands: messages starting with `/` → `emitCommand(name, args, login)`.
  - Manual routing: if `manualRouting`, either `ChatForwardToLogin` (no format) or reformat with `messageFormat` and broadcast.
  - Connect/disconnect messages via `formatMessage`.
  - Long messages split with `splitChatMessage`.
  - Templated announcements after admin actions (`scriptNameChangeMessage`, `matchSettingsLoadedMessage`, `scriptSettingsSavedMessage`, `mapListChangeMessage` via `announceMapListChange`). Because the chat config lives in the service, **these announcements must be done by the service** as part of the command (see GS-52).
- **GS-44** The `adminCommand` event fans out to the notifications WS (section 8).

## 7. GBX service: command API (replaces `src/actions/gbx/**`)

Called only by Next (X-5). Next does the permission check and the audit log, and the service does the GBX work. Every endpoint is scoped by `serverId` and must return a clear error when the manager is missing or disconnected.

- **GS-50 Generic call.** Most actions are thin `client.call(method, ...args)` wrappers. Recommended: one internal `POST /servers/:id/call` with `{ method, params }` plus an **allowlist** of methods. Allowlist (current usage):
  - Server: `GetServerOptions`, `GetHideServer`, `IsKeepingPlayerSlots`, `AreHornsDisabled`, `AreServiceAnnouncesDisabled`, `GetSystemInfo`, `AreProfileSkinsDisabled`, `IsMapDownloadAllowed` (read settings); `SetServerOptions`, `SetConnectionRates`, `DisableProfileSkins`, `AllowMapDownload` (save settings); `GetMainServerPlayerInfo` (+ `GetServerOptions` for the join link); `GetChatLines`.
  - Game: `RestartMap`, `NextMap`, `Set/GetForceShowAllOpponents`, `GetScriptName`, `AppendPlaylistFromMatchSettings`, `InsertPlaylistFromMatchSettings`, `SaveMatchSettings`, `GetModeScriptInfo`, `GetModeScriptSettings`, `TriggerModeScriptEventArray`.
  - Maps: `GetCurrentMapIndex`, `JumpToMapIndex`, `GetMapList`, `GetMapInfo`, `GetCurrentMapInfo`.
  - Players: `GetPlayerList`, `GetPlayerInfo`, `Ban`, `UnBan`, `GetBanList`, `CleanBanList`, `BlackList`, `UnBlackList`, `GetBlackList`, `Load/Save/CleanBlackList`, `AddGuest`, `RemoveGuest`, `GetGuestList`, `Load/Save/CleanGuestList`, `Kick`, `ForceSpectator`.
  - Advanced: `ConnectFakePlayer`, `DisconnectFakePlayer`.
  - Server plugin (the dedicated's own): `Get/SetServerPlugin`, `Get/SetServerPluginVariables`, `TriggerServerPluginEvent(Array)`.
  - Multicall support is required (`getServerSettings`, `saveServerSettings`, `getJoinLink`).
- **GS-51 Chat send.** `ChatSendServerMessage(ToLogin)`. Next builds the `[$D00Admin] name: msg` prefix from the session; the service just sends.
- **GS-52 Stateful commands.** These touch live state, plugins or chat config, so they must be dedicated endpoints and not passthrough:
  - `setScriptName` → call + `scriptNameChangeMessage` announce.
  - `loadMatchSettings` → call + `matchSettingsLoadedMessage` announce.
  - `setModeScriptSettings` → call + `Echo("", "UpdatedSettings")` + `scriptSettingsSavedMessage` announce.
  - `pauseMatch(bool)` → `Maniaplanet.Pause.SetActive` + set `isPaused`, `roundNumber--`.
  - `addMap`, `addMapList`, `removeMap` (refuse removing the last map → `RemoveLastMapError`), `removeMapList`, `reorderMapList` → call + `announceMapListChange`.
  - `setPlayerRound/Map/MatchPoints` → `Trackmania.SetPlayerPoints` + `setPlayer` + emit `playerUpdated`.
  - `setTeamRound/Map/MatchPoints` → `Trackmania.SetTeamPoints` + `setTeam` + emit `teamUpdated`.
  - Live-state reads: `activePlayers`, `liveInfo`, `activeMap` (for SSR pages that need a first paint without opening a WS).

## 8. GBX service: realtime WebSocket API (replaces `src/app/api/ws/**`)

Envelope stays `{ "type": string, "data": any }` so `useWebSocket` and the consumers (`live-dashboard.tsx`, `player-list.tsx`, `map-carousel.tsx`, `clients.tsx`, `servers-provider.tsx`, `notification-provider.tsx`) only need a URL change.

- **GS-60 Auth.** The browser currently sends the next-auth session cookie and the route decodes it with `getToken` + `NEXTAUTH_SECRET`. Choose one:
  - **(a)** Reverse-proxy `/api/ws/*` on the same origin to the service, and the service decodes the next-auth v4 JWE with the shared secret (easy if the service is Node: use `next-auth/jwt` `decode`).
  - **(b)** Next issues a short-lived signed WS ticket (`GET /api/ws-ticket`) containing the token claims, and the client connects with `?ticket=`. This works cross-origin and doesn't tie the service to next-auth internals. **Recommended.**

  Claims required: `id`, `admin`, `permissions`, `servers[{id, name, role, filemanagerUrl}]`, `groups[{role, servers[]}]`, `adminGroups[{servers[]}]`.
- **GS-61 Channels** (same paths, same permission rules, same initial snapshot):

  | Channel | Access rule | Snapshot on open | Events |
  |---|---|---|---|
  | `/servers` | servers from `groups` ∪ `adminGroups` | `servers`: `[{id, name, filemanagerUrl, isConnected}]` | `connect`, `disconnect` `{serverId}` |
  | `/clients` | `admin` or `servers:clients:view` → all managers; else servers where `token.servers[].role === "Admin"` | `clients`: `[{serverId, name, isConnected, isReconnecting, reconnectingAt}]` | `connect`, `disconnect`, `reconnect {serverId, type: "try"\|"stop", time}` |
  | `/notifications` | user's servers; deliver only if `notification.userId === token.id` and user is Admin on that server | none | `adminCommand` (Notifications row) |
  | `/live/:id` | `admin` or server in `token.servers` or in any `token.groups` | `beginMatch {info: liveInfo}` | `finish, checkpoint, giveUp, beginRound, playerInfoChanged, playerDisconnect` → `{round}`; `personalBest, endRound, beginMatch, warmUpStart, warmUpEnd, warmUpStartRound, updatedSettings, elimination` → `{info}`; `playerConnect {live}`; `beginMap/endMap {mapUid}`; `playerUpdated {round}`; `teamUpdated {team}`; `playerChat {chat}` |
  | `/map/:id` | same as `/live` | `activeMap` (uid) | `startMap`, `endMap` `{mapUid}` |
  | `/players/:id` | `hasPermissionsJWTSync(token, routePermissions.servers.players, id)` | `playerList` | `playerConnect` (PlayerInfo), `playerDisconnect {login}`, `playerInfo`, `playerList` |

  Note the internal→wire name mapping in `/live` (`live-finish`→`finish`, `live-checkpoint`→`checkpoint`, `live-endRound`→`endRound`, `live-giveUp`→`giveUp`, `playerConnectInfo`→`playerConnect`, `playerDisconnectInfo`→`playerDisconnect`).
- **GS-62 Listener hygiene.** Per-socket listener set, removed on close (today: `addListeners(listenerId)` / `removeListeners`). Opening a socket must **not** create or connect managers as a side effect (today `/servers` and `/notifications` do via `getGbxClientManager`).
- **GS-63 Permission source.** Permission helpers (`hasPermissionsJWTSync`, `routePermissions` in `src/routes`) must be importable by the service, so put them in a shared package next to the Prisma schema.

## 9. Next.js: Server Actions → API routes

- **NX-1 Route coverage.** One route handler per current action, grouped like the action folders. Every exported function in `src/actions/**` that has a client caller needs an endpoint:
  - `database/*`: audit-logs, groups (+ order endpoints), hetzner-projects, maps (map list, records paginated, by uids), matches (+ CSV export), notifications (list, mark read), plugins, records (export), roles, server-plugins, servers (+ chat config), users (+ search).
  - `filemanager/*`: route listing, get file, save text, delete, upload, create entry, scripts, plugin-scripts, match-settings.
  - `gbx/*`: thin proxies to the GBX service command API (section 7). Next still does the auth and the audit log.
  - `hetzner/*`, `nadeo/*`, `tmx/*`: as today.
- **NX-2 Auth parity.** Each endpoint enforces the exact permission list from its current `doServerActionWithAuth([...])` call, including `servers:{id}:admin|moderator` and `group:servers:{id}:admin|moderator`. Wrap this in a route helper (`withApiAuth(perms, handler)`) that mirrors `doServerActionWithAuth` (logging + Sentry + `{data, error}`).
- **NX-3 Audit logging stays in Next** (`logAudit(userId, serverId, action, details, error)`), with the same action keys (`server.game.script.edit`, `server.maps.maplist.add`, ...), including logging failed GBX calls with the error string.
- **NX-4 Server lifecycle notifications.** After create/update/delete server, chat-config update, plugin enable/config update or reload, notify the GBX service (GS-5).
- **NX-5 Mixed flows** that span both apps and need to be orchestrated from Next:
  - `getMapList` (`database/maps.ts`): GBX `GetMapList`/`GetMapInfo` + DB + Nadeo `checkAndUpdateMapsInfoIfNeeded`.
  - `getLocalMaps` (`gbx/server.ts`): filemanager `/maps` + GBX `GetMapInfo` per file.
  - TMX/Nadeo "add map/mappack/campaign/room to server": download → filemanager upload → GBX `addMap` (with announcement).
  - Jukebox get/set/clear/add/remove: Redis only, stays in Next (contract X-4).
- **NX-6 Large uploads.** `serverActions.bodySizeLimit: "1gb"` exists for `uploadFiles`. The API route must stream multipart through to the filemanager rather than buffering it, and the proxy/body limits must allow 1 GB.
- **NX-7 Client data layer.** About 130 client components import actions directly. Add a typed fetch client (`src/lib/api-client/*`) that keeps the `{data, error}` return shape, so each call site changes only its import.
- **NX-8 Server components.** About 15 `page.tsx` files call actions during SSR. They should call shared service functions directly (not HTTP to themselves), so split each action into a `service` function (pure logic) + `route` (auth/HTTP) + `client` (fetch).
- **NX-9 Startup.** `instrumentation.ts` keeps Sentry init, Nadeo token warm-up and `syncAllMaps()`. GBX manager boot moves to the service (GS-1).
- **NX-10 Remove** `src/server.ts`, `next-ws`, the `prepare` script, `appGlobals.gbxClients`, `@evotm/gbxclient`, `handlebars*`, `build:templates`, and `src/plugins/**` from the Next app. `dev`/`start` go back to plain `next dev` / standalone `server.js`.

## 10. Existing bugs: fix them, don't port them

Found while mapping this out. They're cheap to fix during the rewrite:

1. **Duplicate callback listeners after reconnect.** `setupListeners` calls `removeListener` with a brand-new arrow function (a no-op), so every reconnect adds another `callback` handler on the same `GbxClient`. After N reconnects every event is handled N+1 times (double records, double chat messages). `gbxclient-manager.ts:697-707`.
2. **`stopReconnect` never removes the disconnect listener.** `removeListener("disconnect", this.onDisconnect.bind(this))` uses a new bound function. `gbxclient-manager.ts:247`.
3. **"Resend all manialinks" sends nothing.** It builds `multi` and logs it but never calls `multicall`. `manialink-manager.ts:213-232`.
4. **"Disconnect client" doesn't disconnect.** It only emits `disconnect` with no `serverId`, never closes the socket or unloads plugins, and the UI gets `{serverId: undefined}`. `actions/gbx/clients.ts:74`.
5. **Server create/update doesn't (re)connect** (GS-5).
6. **WS opens create managers** as a side effect (GS-62).
7. **Notifications WS only subscribes to group servers** (`token.groups`), so a user who is Admin through a direct `user_servers` row gets no live admin notifications. `api/ws/notifications/route.ts:34`. Check whether that's intended.

Found while porting and testing the GBX service. All are fixed in `apps/gbx-service`; the web app's copies remain until phase 4 removes them:

8. **A refused connection crashes the process.** `@evotm/gbxclient` attaches socket `error` listeners only after connecting, so `ECONNREFUSED` becomes an uncaught exception. The old Next server appears to have survived it; a plain Node service would exit every time a dedicated server is down.
9. **A map that isn't on Nadeo breaks connecting.** `createMap` throws when Nadeo has no metadata for the map, which fails `syncMap` and so the whole connect.
10. **Late callbacks from a replaced session** would still be applied to the new session's state.
11. **`setPlayerMapPoints` writes `roundPoints`.** `actions/gbx/player.ts:595`.
12. **`getPlayerRecords` ignores the server's own records** unless the server is in a record-sharing group, so `player-info` shows no local records on standalone servers.
13. **TA leaderboard:** a player's first finish isn't shown until their next improvement, and players without a time sort above everyone else.
14. **Pick & ban starting with a random step never advances.** Random steps only run after a player action.
15. **Closing a window closes it for every player** with the same window id (e.g. two admins with the ECM window open).
16. **Scores for a player missing from `liveInfo.players`** are stored under the key `"undefined"`. The same happens for give-ups.
17. **A failing chat announcement fails the admin action** after the map list was already changed.

`hasPermissionsJWTSync` also mutates `jwt.permissions` on every call (the shared `hasPermission` is pure).

## 11. Decisions to make before starting

- **Language for the GBX service.** If it's Node/TS you can lift `gbxclient-manager`, the plugins, the handlebars templates and `next-auth/jwt` decode almost verbatim. Anything else (e.g. reusing `gbx-rs` from tm-tourney-manager) means porting about 4k lines of plugin/manialink code and the JWE decode. **The plugin marketplace (section 12) weighs on this too:** the plugin runtime has to sandbox untrusted code (JS isolate or WASM), so choose the service language with that runtime in mind.
- **Plugin runtime isolation model** (section 12, PM-5): in-process isolates, worker/process per plugin, or WASM.
- **Service → DB:** direct Prisma (recommended, GS-31) or via Next internal API.
- **Next → service change notifications:** HTTP calls or Redis pub/sub (GS-5).
- **WS auth:** same-origin proxy + JWE decode, or ticket (GS-60).
- **Generic `call` passthrough with allowlist vs. one typed endpoint per action** (GS-50). The passthrough cuts the endpoint count by about 50, and typed endpoints give better validation.
- **Monorepo layout** for the shared Prisma schema, types (`src/types/{gbx,live,player,server,plugins}`), permission helpers and logger. Bun workspaces would fit, since you're already on bun.

---

## 12. Future: plugin marketplace

**Not in scope for the split**, but the split must not block it. The goal: servers stop shipping with every plugin built in. Admins install plugins per server. Users can write their own plugins, upload them privately to their own servers, or submit them to a public marketplace for review.

### 12a. Constraints for the split itself

Today, plugins are compiled into the app (hardcoded list in `plugin-manager.ts`), registered by SQL migrations (`*_default_plugins`, `*_player_info_plugin`, ...), configured through hand-written React forms (`src/forms/server/plugins/{ecm,live-round,match,player-info,records-info}`), and free to import anything (`getClient()`, `@/actions/database/server-only/*`, `@/lib/api/nadeo`, raw `manager.client`). Every one of those has to go before third-party plugins are possible. The rewrite is the cheapest moment to fix them.

- **PM-1 Plugin SDK boundary.** Plugins only get a context object and never import service internals. Minimum surface:
  - events (the GS-15 bus, read-only payloads), chat commands, manialink actions;
  - manialink display/hide/destroy;
  - chat send;
  - **scoped** GBX calls (allowlisted per capability, not raw `client.call`);
  - per-plugin storage (PM-6);
  - config + config-change hook;
  - logger;
  - read-only data helpers (local records, player records, map by uid/filename);
  - allowlisted outbound HTTP (ECM and Nadeo leaderboards are the current use cases).
- **PM-2 Port the built-in plugins onto that SDK.** If `match`, `ecm` and `live-round` can't be written against the public SDK, nobody else's plugins can be either. The built-ins become first-party packages that are preinstalled.
- **PM-3 Dynamic registry.** No hardcoded plugin list and no plugin rows seeded by migrations. Plugins are loaded from a registry (DB + bundle storage) and identified by `slug` + `version` instead of the bare `name` string the `plugins` table uses now.
- **PM-4 Namespaced, runtime-loaded templates.** Today all `.hbs` files are precompiled at build time into one global `Handlebars.templates`. Each plugin must ship its own templates, compiled at load time. Manialink IDs and action names are prefixed per plugin, so plugin A can't hide or hijack plugin B's widgets or actions. The same applies to chat command collisions.
- **PM-5 Isolation.** A throwing, hanging or leaking plugin must not kill the service, the GBX connection or other servers. Add error boundaries around every plugin hook now, including for built-ins. Untrusted code also needs a real sandbox, with no access to the service's env (DB URL, Nadeo creds, `NEXTAUTH_SECRET`). Options: `isolated-vm`, a worker/process per plugin with an RPC bridge, or WASM (Extism, which also allows non-JS plugins). A plain `import()` of an uploaded bundle hands the uploader your database credentials.
- **PM-6 Plugin storage API.** Plugins stop writing to Prisma directly (the ECM window updates `server_plugins.config` today). They get a per-plugin, per-server KV/document store plus `setConfig` through the SDK.
- **PM-7 Config schema owned by the plugin.** Each plugin declares a JSON Schema (+ optional UI hints). Next renders a generic form, validates on save, and the GBX service validates again on load. This replaces the per-plugin React forms. Fields can be marked `secret` (the ECM `apiKey`): secrets are write-only in the UI and left out of `exportServerPluginConfig`, which currently returns the raw config including the key.

### 12b. Marketplace requirements (later)

- **PM-10 Package format.** A manifest with `slug`, `name`, `version` (semver), `sdkVersion`, `entry`, `gamemodes`, `commands`, `capabilities`, `configSchema`, `templates`, `helpText`, `author`, `license`, `repository`. Plus a bundle: size-limited and content-hashed, with signatures for approved versions.
- **PM-11 Capabilities.** Declared in the manifest, shown to the admin at install time, enforced at runtime. Examples: `chat:send`, `players:moderate` (kick/ban/spec), `maps:write`, `mode:control` (pause, script settings, points), `records:read`, `storage`, `http:<domain>`. A new version that adds capabilities needs the admin's consent again before it updates.
- **PM-12 Resource limits.** CPU time per hook, memory, GBX call rate, manialink size, chat message rate. When a plugin goes over a limit, auto-disable it and notify the admin.
- **PM-13 Per-server lifecycle.** Install, uninstall, enable/disable, update, pin a version, roll back. Hot load/unload without reconnecting the dedicated server. Migrations for plugin storage/config between versions.
- **PM-14 Private plugins.** A user uploads a bundle that is only installable on servers they're Admin of (direct or via group). No review, but the same sandbox and limits.
- **PM-15 Review workflow.** Submit version → pending → approved/rejected with reviewer notes. Only approved versions are public. Every new version is reviewed again. Takedown/yank force-disables the plugin everywhere, and users can report abuse.
- **PM-16 Catalog UI.** Search, filters (gamemode, capability), detail page (description, screenshots, changelog, versions, install count, author), installed-plugins view with available updates.
- **PM-17 Permissions.** New global permissions `plugins:publish` and `plugins:review` (add to `ROLES.md`). Server-level install/configure stays with the server Admin role. Audit log entries for upload, submit, review, install, update, uninstall, config change.
- **PM-18 Developer experience.** SDK published as an npm package with types, a CLI to scaffold/package/upload, local dev mode against a test server, docs and an example plugin. Porting the built-ins (PM-2) produces the reference examples.
- **PM-19 Bundle storage.** Volume, S3-compatible or DB blob. It has to work when Next (upload/review) and the GBX service (loading) run in different containers.

### 12c. Open questions

- **Central or per-instance marketplace?** GoControlPanel is self-hosted, so each installation has its own DB. A shared marketplace across installations means running a central registry service (with its own accounts and review team), with self-hosted panels pulling from it. A per-instance one is just "private plugins + an admin approval step". This is the biggest decision here, and it changes PM-15, PM-16 and PM-19.
- **Sandbox technology** (PM-5), which ties back to the service language choice in section 11.
- **Custom config UI.** Is JSON Schema + UI hints enough, or do some plugins (the `match` pick & ban setup) need custom UI? Sandboxed iframes are possible but add a whole new attack surface.
