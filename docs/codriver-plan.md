# Codriver: AI server assistant plan

Status: phases 0–5 implemented; live-server verification and paid model evaluation remain manual. Later integrations remain planned. Replaces the earlier `ai-assistant-proposal.md`.

**Codriver** is a natural-language assistant for GoControlPanel servers. In rally the co-driver reads the notes and the driver acts; here the player says what they want and Codriver turns it into panel operations. In game it answers to `/co <request>` (alias `/ai`); in the panel it is a chat box on the server page.

```
/co play a random snowcar map          -> finds a SnowCar map on TMX, adds and queues it
/co cup mode with 100 points limit     -> asks to confirm, then switches to Cup with S_PointsLimit 100
/co enable the live round plugin       -> enables the Live Round plugin on this server
/co who holds the record on this map?  -> answers from local records
```

Low running cost is the first design constraint. Correct authorization is the second; neither is traded for features.

## 1. Review of the earlier proposal

Changes compared with `ai-assistant-proposal.md`:

1. **Built-in feature instead of a marketplace plugin.** The proposal had a plugin forward chat to the panel. That needs a new plugin-to-panel authentication scheme, an `http:<panel host>` capability on every install, and gives the plugin nothing it can use: every operation Codriver performs lives in the panel or the GBX service. The GBX service already has a chat command router (`core/chat/command-router.ts`) and a login-to-role check (`infra/db/system-command-services.ts`), so `/co` belongs there as a system command, toggled per server. Plugins integrate through events instead (section 12).
2. **Mode names are script names.** Modes are the script names in `apps/web/src/lib/scripts.ts` (`Trackmania/TM_Cup_Online.Script.txt`, and so on), and that file already lists every setting with type and default (`ParamDescs`). Settings tools validate against it instead of hand-written fields such as `points_limit`.
3. **Login mapping already exists.** `Users.login` is unique and roles come from `UserServers` and `GroupMember` (`Admin`, `Moderator`, `Member`). The missing part is running existing actions for a resolved user without a browser session (section 5).
4. **Plugin install is excluded.** Installing grants capabilities and needs admin consent; Codriver can enable, disable and configure installed plugins only.
5. **TMX vehicle filter is unverified.** The current TMX search UI sends no vehicle parameter. Confirm the TMX API parameter for vehicle (or the matching tag) before building `queue_tmx_map`.
6. **No encryption helper exists** for stored secrets. Storing per-server API keys needs one (section 9).

## 2. Goals and non-goals

Goals:

- Turn a chat request into one validated, authorized panel operation, or a short answer.
- Same permissions as the panel: Codriver never lets someone do more than they could in the UI.
- Predictable cost: cents per month for a normal server, with hard budgets.
- Every change audited, disruptive changes confirmed.
- The panel operator controls where Codriver runs, who may use it and who pays, per server, group and user.

Non-goals:

- Free-form agent with raw `gbx.call`, database or file access.
- Money-related or account-level actions: Hetzner, users, roles, groups, server creation or deletion, ECM submission.
- Revealing secrets such as server passwords or API keys.
- Replacing the panel for complex configuration.

## 3. Entry points

| Entry point                                                          | Who                                                           | Phase |
| -------------------------------------------------------------------- | ------------------------------------------------------------- | ----- |
| In-game `/co`, `/ai`                                                 | Players on the server; rights from their linked panel account | 2     |
| Panel chat box on the server page                                    | Logged-in panel users                                         | 5     |
| CLI harness (`bun run codriver "<text>" --server <id> --as <login>`) | Developers, evals                                             | 1     |
| MCP server (see `mcp-server-proposal.md`)                            | AI clients, reusing the same tool registry                    | Later |

## 4. Architecture

```
game chat ─▶ GBX service: command router ─/co─▶ CodriverClient ──HTTP──▶ web: POST /api/internal/codriver
panel UI  ─────────────────────────── Server Action ───────────────────▶ web: Codriver runner
                                                                               │
          fast path ─▶ rate limit/budget ─▶ context ─▶ model ─▶ validate ─▶ authorize ─▶ confirm? ─▶ execute ─▶ audit ─▶ reply
                                                                               │
                                          existing services (TMX, file manager, maps, game, plugins) ─▶ GBX service
```

- **Runner in `apps/web`.** All operations Codriver needs (TMX download, file manager upload, plugin state, map and mode changes, records) are already implemented there. The runner calls the GBX service through `GBX_SERVICE_URL` like every other web action; the web process still opens no dedicated-server connection.
- **New internal web route** `POST /api/internal/codriver` for the GBX service. Authenticated with a new shared secret (`PANEL_INTERNAL_TOKEN`), not a user session. The service sends `{serverId, login, text}`; the route resolves the caller from `login` and never trusts any role or user id in the body.
- **GBX service side:** a `/co` system command that skips the HTTP call when its cached availability flag says Codriver is off for the server (the web route stays the authority and re-checks every layer), shows a "thinking" reply only if the call takes over about 1.5 s, calls the web route with a timeout, and prints the reply with `chat-service.sendTo`.
- **Module layout** (`apps/web/src/lib/codriver/`): `runner.ts`, `fast-path.ts`, `tools/` (one file per category), `validate.ts`, `prompt.ts`, `budget.ts`, `confirm.ts`, `reply.ts`. Tools are plain typed objects so the CLI harness, the internal route, the panel chat and a later MCP adapter share them.

## 5. Authorization

Prerequisite refactor: actions currently authorize through `doServerActionWithAuth(roles, fn(session))`, which reads the browser session. Split it into:

- `resolveClaims(session)` for browser requests, and `resolveClaimsForLogin(login)` for Codriver, both producing the same claim set (`servers:<id>:admin`, `group:servers:<id>:moderator`, panel `admin`, ...).
- `doServerActionAs(claims, roles, fn)` which the existing `doServerActionWithAuth` wraps. Existing actions keep their behavior; Codriver calls the same service functions with resolved claims.

Every tool declares a minimum role. The runner checks it before execution, and the underlying service function checks it again. Players without a linked account are `guest`.

| Role               | Can use                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| guest (no account) | Nothing by default; the server admin can allow read tools and `request_map`                            |
| Member             | Same as guest by default; admin can allow map requests to queue directly                               |
| Moderator          | Map, jukebox, mode settings, pause, kick, spectate, chat announce                                      |
| Admin              | Mode script switch, plugin enable/disable and config, bans, blacklist, guests, points, server settings |
| Panel admin        | Same as Admin on every server                                                                          |

Unknown login or deleted user means `guest`. Role checks run per tool call, not per request.

### 5.1 Operator access and API keys

The panel operator (a panel admin, `Users.admin`) decides where Codriver may run and who pays for it. Server admins then decide how it behaves on their server. Everything is off by default.

Three layers must all allow a request:

1. **Operator master switch** (`CodriverPanelSettings.enabled`). Off means Codriver is off everywhere and `/co` replies that it is unavailable.
2. **Operator access rules** (`CodriverAccessRules`), each with a target and `allow` or `deny`:
   - **Server rule:** makes Codriver available on that server, or blocks it.
   - **Group rule:** applies to every server in the group. Group membership of users plays no part in Codriver access.
   - **User rule:** allows or blocks that panel user on every server.
3. **Server admin switch** (`CodriverSettings.enabled` for that server), plus the server's guest and member access settings. Server admins see the Codriver tab only once the operator has made Codriver available on their server.

Resolution for a request on server S by caller U:

1. Server availability: a server rule for S wins. Otherwise the group rules of the groups containing S apply, and any `deny` beats any `allow`. No matching rule means not available.
2. User: only user rules apply. A `deny` user rule blocks U everywhere. When the operator sets **user mode** to `allowlist`, U also needs an `allow` user rule. Guests have no account, so they are blocked in allowlist mode.
3. Server settings: the server admin has turned Codriver on, and the caller's role (or guest status) is allowed by the server's access settings.

Each refused layer has its own reply ("Codriver is not enabled on this server", "You don't have access to Codriver"), so admins can tell which layer refused.

**API keys.** A request uses the first key that applies:

1. **Server key:** set by a server admin in the Codriver tab. Allowed only when the operator has turned on `allowServerKeys`. The server's own monthly budget applies.
2. **Shared key:** the operator's panel-wide key, used only if the rule that made the server available has `useSharedKey` turned on. Two budgets apply: the rule's `sharedMonthlyBudgetCents` per server, and the operator's global shared budget. The operator also picks which models shared-key requests may use (`sharedKeyModels`, default Haiku only), because the operator pays for them.
3. No key: Codriver replies that it is not configured, and the server admin sees a warning in the Codriver tab.

Every request record stores which key paid (`keySource`), so the operator can see shared-key spend per server and group.

Changes to rules, keys and budgets are written to the audit log. Server admins can never see the shared key or the operator's budgets, only whether a shared key is available and how much of their server's shared allowance remains.

## 6. Request pipeline

1. **Fast path** (no model): `help`, `yes`/`no`, `usage`, `skip`, `restart`, `pause`, `resume`, `enable|disable <plugin>` with a fuzzy match against installed plugins. Covers a large share of commands for free.
2. **Gates:** the three access layers of section 5.1, a usable API key, per-player cooldown, per-server rate limit, the budgets for the chosen key not spent, text length at most 300 characters. The fast path runs after the access layers too, so a blocked user can't use it.
3. **Context:** a compact block with the current mode, map name, player count, jukebox length and caller role. Installed plugin slugs and the current mode's setting names go into tool enums, not prose.
4. **Model call:** one call with only the tools for the categories the text touches (keyword routing; send all categories if none match).
5. **Validate:** JSON schema plus semantic checks (setting exists for the target mode, value within type, plugin installed, map exists). On failure or a text answer where a tool was expected, retry once on the escalation model.
6. **Authorize:** caller role against the tool's minimum role.
7. **Confirm:** disruptive tools store a pending action and ask for `/co yes` (section 7).
8. **Execute:** call the existing service functions; up to 3 tool calls in one request, run in the order given, stopping on the first failure.
9. **Audit and usage:** write the request record (section 9) and `logAudit` for every executed change, with the actor set to the resolved user.
10. **Reply:** template filled from the tool result, private to the caller; state changes that affect everyone also use the existing chat config admin action messages.

## 7. Confirmation

- Disruptive tools: script switch, settings change during a running match, skip or restart with players racing, kick, ban, blacklist, points changes, server settings, plugin config.
- Pending action stored in Redis under `codriver:pending:<serverId>:<login>` with a 60 s TTL. It holds the validated tool call, not the text, so `/co yes` runs exactly what was shown.
- Reply format: `Switch to Cup with points limit 100 at the next map? /co yes or /co no`.
- In the panel chat the confirmation is a button. In game a manialink with Yes and No buttons is a later improvement; chat confirmation is enough for the first version.
- Admins can turn confirmation off per tool category in settings.

## 8. Tool catalog

All arguments are enumerated or bounded. Server and caller come from the request context, never from model output. "Existing" names the function the tool reuses.

### Maps

| Tool                 | Arguments                                                                                                                             | Role      | Confirm   | Existing                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ----------------------------------------------------------- |
| `queue_tmx_map`      | `vehicle?`, `tags?`, `difficulty?`, `max_author_time_s?`, `author?`, `name?`, `pick: random\|best_awarded\|newest`, `when: next\|end` | Moderator | No        | `searchTMXMaps`, `downloadMap`, `addMap`, `addMapToJukebox` |
| `queue_server_map`   | `query` (fuzzy matched in code against the map list), `when`                                                                          | Moderator | No        | `addMapToJukebox`                                           |
| `jump_to_map`        | `query`                                                                                                                               | Moderator | Yes       | `jumpToMap`                                                 |
| `skip_map`           | none                                                                                                                                  | Moderator | If racing | `nextMap`                                                   |
| `restart_map`        | none                                                                                                                                  | Moderator | If racing | `restartMap`                                                |
| `remove_map`         | `query`                                                                                                                               | Admin     | Yes       | `removeMap`                                                 |
| `clear_jukebox`      | none                                                                                                                                  | Moderator | No        | `clearJukebox`                                              |
| `add_tmx_mappack`    | `query` or `mappack_id`, `limit` (max 25)                                                                                             | Admin     | Yes       | TMX mappack actions                                         |
| `add_nadeo_campaign` | `which: current_seasonal\|weekly_shorts\|...`                                                                                         | Admin     | Yes       | `downloadCampaign`, `addCampaignToServer`                   |
| `request_map`        | same filters as `queue_tmx_map`                                                                                                       | guest     | No        | Posts a request admins accept in game or the panel          |

When a fuzzy match is ambiguous the tool returns up to 5 candidates and the reply asks the caller to pick one; the model is not called again.

### Mode and match

| Tool                  | Arguments                                                                                                             | Role      | Confirm          | Existing                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- | --------- | ---------------- | --------------------------------------------------------------- |
| `set_mode`            | `script` (enum from `scripts.ts`), `settings?` (validated against that script's `ParamDescs`), `apply: now\|next_map` | Admin     | Yes              | `setScriptName`, `setModeScriptSettings`                        |
| `set_mode_settings`   | `settings` (current script's `ParamDescs`)                                                                            | Moderator | If match running | `setModeScriptSettings`                                         |
| `load_match_settings` | `file` (enum of existing match settings files)                                                                        | Admin     | Yes              | `loadMatchSettings`                                             |
| `pause_match`         | `paused`                                                                                                              | Moderator | No               | `pauseMatch`                                                    |
| `warmup`              | `action: extend\|end`, `seconds?`                                                                                     | Moderator | No               | `triggerModeScriptEventArray`, only for scripts that support it |

Common aliases map to settings in code, not in the prompt: "points limit" to `S_PointsLimit`, "time limit" to `S_TimeLimit`, "rounds per map" to `S_RoundsPerMap`, and so on, per script.

### Players

| Tool                                      | Arguments                                                           | Role      | Confirm | Existing                             |
| ----------------------------------------- | ------------------------------------------------------------------- | --------- | ------- | ------------------------------------ |
| `kick_player`                             | `player` (fuzzy against online players), `reason?`                  | Moderator | Yes     | `kickPlayer`                         |
| `force_spectator`                         | `player`, `mode: spectator\|player\|free`                           | Moderator | No      | `forceSpectator`                     |
| `ban_player` / `unban_player`             | `player`, `reason?`                                                 | Admin     | Yes     | `banPlayer`, `unbanPlayer`           |
| `blacklist_player` / `unblacklist_player` | `player`                                                            | Admin     | Yes     | `blacklistPlayer`, ...               |
| `add_guest` / `remove_guest`              | `player`                                                            | Admin     | Yes     | `addGuest`, `removeGuest`            |
| `set_points`                              | `target: player\|team`, `who`, `scope: round\|map\|match`, `points` | Admin     | Yes     | `setPlayer*Points`, `setTeam*Points` |

Codriver never acts on a player with a higher role than the caller.

### Plugins

| Tool                 | Arguments                                                         | Role  | Confirm | Existing                 |
| -------------------- | ----------------------------------------------------------------- | ----- | ------- | ------------------------ |
| `set_plugin_enabled` | `plugin` (enum of installed plugins), `enabled`                   | Admin | No      | `setServerPluginEnabled` |
| `set_plugin_config`  | `plugin`, `values` (validated against the manifest config schema) | Admin | Yes     | `saveServerPluginConfig` |
| `reload_plugins`     | none                                                              | Admin | No      | `reloadServerPlugins`    |

### Server and chat

| Tool                  | Arguments                                                             | Role      | Confirm | Existing             |
| --------------------- | --------------------------------------------------------------------- | --------- | ------- | -------------------- |
| `set_server_settings` | `name?`, `comment?`, `max_players?`, `max_spectators?` (no passwords) | Admin     | Yes     | `saveServerSettings` |
| `announce`            | `message` (max 200 characters)                                        | Moderator | No      | `sendChatMessage`    |

### Read and answer

These return data; the reply is a template, or for open questions one short model-written answer from the returned data.

| Tool                | Returns                                              | Role      |
| ------------------- | ---------------------------------------------------- | --------- |
| `get_server_state`  | Mode, map, players, jukebox, pause and warmup state  | guest     |
| `get_mode_settings` | Current settings with descriptions from `ParamDescs` | guest     |
| `explain_setting`   | Description, type and default of a setting           | guest     |
| `get_map_records`   | Local top 5 and the caller's record                  | guest     |
| `get_world_record`  | World record for the current map (Nadeo)             | guest     |
| `get_last_match`    | Result of the last recorded match                    | guest     |
| `list_plugins`      | Installed plugins and whether they are enabled       | Moderator |
| `codriver_help`     | What the caller can ask, filtered by role            | guest     |

Answer replies are capped at 250 characters and cost one extra short model call only for open questions; templated reads cost nothing extra.

## 9. Data and settings

New Prisma models, added to both the MySQL and PostgreSQL schemas with migrations for each:

- `CodriverPanelSettings` (single row, operator only): `enabled`, `sharedApiKeyEncrypted`, `sharedKeyModels`, `sharedMonthlyBudgetCents` (global), `allowServerKeys`, `userMode` (`everyone|allowlist`), `retentionDays`, timestamps. The panel has no global settings table yet, so this is the first one.
- `CodriverAccessRules` (operator only): `targetType` (`server|group|user`), `targetId`, `effect` (`allow|deny`), `useSharedKey`, `sharedMonthlyBudgetCents` (per server, nullable for no cap), `createdById`, timestamps, unique on `(targetType, targetId)`. `useSharedKey` and `sharedMonthlyBudgetCents` only apply to server and group rules. Rules for deleted servers, groups or users are ignored and removed with them.
- `CodriverSettings` (one per server, server admins): `enabled` (default off), `apiKeyEncrypted`, `model` (`haiku` or `sonnet`, limited to `sharedKeyModels` when the shared key pays), `escalation` (on/off), `monthlyBudgetCents` (for the server key), `guestAccess` (`off|read`, default `off`; `request` comes with `request_map`), `memberAccess` (default `off`), `cooldownSeconds`, timestamps. Turning confirmation off per category is not built yet; disruptive tools always confirm.
- `CodriverRequests`: `serverId`, `userId?`, `login`, `source` (`game|panel|cli`), `text`, `toolCalls` (JSON), `status` (`done|needs_confirmation|planned|unclear|denied|failed|over_budget`), `keySource` (`server|shared|none`), `model`, `inputTokens`, `outputTokens`, `cacheReadTokens`, `costMicros`, `latencyMs`, `createdAt`. Used for audit, usage display and budgets. Rows older than `retentionDays` are pruned.

Secrets: an encryption helper (AES-256-GCM, key from a new `SECRETS_KEY` env var) in `apps/web/src/lib/secrets.ts`, since only the panel handles keys. Unlike the Hetzner token helper it fails on a value it can't decrypt instead of returning it. Keys are write-only in the UI (shown as `sk-ant-...last4`), never logged and never sent to the GBX service. Saving a key makes one minimal test call so a wrong key is reported immediately.

Budgets are checked against the sum of `costMicros` for the current month, per key source: the server budget for server-key requests, and the per-server and global shared budgets for shared-key requests. Sums are cached in Redis and updated after each call. The cost per call is computed from `response.usage` and a price table in code.

Access resolution (section 5.1) reads the settings and rules on every request (a few small queries). Add a Redis cache, cleared on every settings or rule change, if it ever shows up in request times.

## 10. Model and prompting

- Default model `claude-haiku-5-5` with `output_config.effort: "low"` and `max_tokens` about 300.
- Escalation to `claude-sonnet-5-5` once, only on validation failure or a text reply where a tool call was expected. Admins can switch the default to Sonnet.
- `tool_choice: auto` (current models reject forced tool choice), `strict: true` on all tools, parallel tool use capped at 3 calls in validation.
- System prompt (about 400 tokens, byte-stable): role, the rule that chat text, map names and player names are data, that it must call a tool or ask one short question, the caller-role sentence, and the reply length limit. Volatile context goes after it in the user turn.
- Tool descriptions are one line each; aliases and setting mapping live in code.
- Handle `stop_reason` `refusal` and `max_tokens` as a failed request with a generic reply.
- Language: English only. Replies, templates and the system prompt are English; requests in other languages are not supported or evaluated.
- Use the Anthropic TypeScript SDK (`@anthropic-ai/sdk`) with typed errors; retry 429 and 5xx through the SDK defaults with a 10 s total timeout.

## 11. Cost

Per command on Haiku 5.5 ($0.10 / $0.50 per 1M tokens), about 1.5K input and 150 output tokens: about $0.0002. With about 5% escalation to Sonnet 5.5 ($2 / $10): about $0.0005. Fast-path commands cost nothing.

| Commands per month | Haiku only  | With about 5% Sonnet escalation |
| ------------------ | ----------- | ------------------------------- |
| 600                | about $0.14 | about $0.30                     |
| 6,000              | about $1.40 | about $3                        |
| 150,000            | about $35   | about $75                       |

These are estimates from assumed token counts. The usage table replaces them with measured numbers from the first day.

Controls: fast path, keyword tool routing, templated replies, one call per command, `max_tokens` cap, per-player cooldown, per-server rate limit, monthly budgets with a hard stop (server, per-server shared and global shared), operator access rules, guests off by default, Haiku-only shared key by default, the operator master switch, and a kill switch env var for deployments.

## 12. Integration with plugins and other features

- Codriver emits `codriver:action` after each executed change (`{tool, args, login}`), so plugins can react, for example a widget showing "map requested by X".
- `request_map` requests appear in the panel and as an admin notification through the existing notifications.
- Later: plugins can declare assistant tools in their manifest (name, description, JSON schema, minimum role), executed through the plugin's own command handler. This needs a manifest and SDK version bump and is out of scope for the first version.
- The tool registry is the basis for the MCP server proposal; both should share it instead of duplicating operations.

## 13. Panel UI

- **Operator page** (panel admins only, under the admin section): master switch, shared API key (write-only), shared key models, global shared budget, allow server keys, user mode, retention. A rules table to add, edit and remove server, group and user rules (allow or deny, use shared key, per-server shared budget), with a "check access" tool that shows the result of section 5.1 for a chosen server and user and which layer decided it.
- **Server settings, Codriver tab** (server admins, visible once the operator has made Codriver available): enable switch, own API key (write-only, only when server keys are allowed), which key is in use, model, escalation, monthly budget, guest and member access, confirmation categories, cooldown, a "test a request" box that shows the planned tool call without executing it.
- **Usage view:** this month's spend against the budget, requests per day, top commands, failure and escalation rate. The operator sees the same across all servers, split by key source, server and group.
- **History:** table of `CodriverRequests` (TanStack Table, GET API route) with filters by status and player.
- **Chat box** on the server page for panel users, using the same runner through a Server Action.

## 14. Safety

- No raw `gbx.call`, database, file or HTTP tools.
- Tool results are not sent back to the model in the single-call path, so map and player names from TMX or the game cannot inject instructions; the one open-question answer call wraps data in clearly delimited blocks and has no tools.
- Strip Trackmania formatting codes and limit length of anything echoed into chat.
- Never act on a player with a higher role than the caller.
- Passwords and keys are not readable through any tool.
- Full audit through `logAudit` plus `CodriverRequests`.

## 15. Observability

- Structured logs with request id, server, tool, status, latency and tokens; no API keys and no full prompts at info level.
- Report unexpected errors to Sentry through the existing helper.
- Alert server admins through notifications when 80% and 100% of their budget is reached and when their API key is rejected. Alert panel admins the same way for the global and per-server shared budgets and the shared key.

## 16. Evaluation

- Dataset of 50 to 100 cases in `apps/web/src/lib/codriver/eval/cases.json`: text, caller role, server state, expected tool and arguments (or expected refusal or clarification). English only. Include typos, slang ("snow map", "rpg map", "cup 100"), multi-intent, ambiguous names, non-admins asking for admin actions, and injection attempts in text.
- Grader in code: exact match on tool name and normalized arguments; no LLM judge.
- Script `bun run --filter @gcp/web codriver:eval --model haiku|sonnet --effort low|medium` prints accuracy, cost and latency. It spends money, so it runs manually, not in CI.
- Choose the default model from these results; add failing real requests (opt-in from the history view) to the dataset.

## 17. Testing

- Unit: fast-path parser, alias mapping, settings validation per script, fuzzy matching, permission matrix per tool and role, budget accounting per key source, confirmation store expiry.
- Access resolution (section 5.1) as a pure function with a table of cases: master switch off, server rule beats group rule, deny beats allow across groups, user deny, allowlist mode with and without a user allow, group rules not affecting the group's members, guests in allowlist mode, server admin switch off, key selection with and without server keys allowed and with exhausted budgets.
- Operator actions are rejected for non-panel-admins at the server entry point, not only hidden in the UI.
- Runner tests with a mocked Anthropic client returning fixed tool calls, including invalid ones, refusals and timeouts.
- Internal route: rejects missing or wrong token, ignores client-supplied roles.
- GBX service: `/co` command routing and reply chunking.
- Real-server check following `real-server-testing.md` for map queueing, mode switch and plugin toggle.

## 18. Phases

Each phase is its own branch, stacked on the previous one.

| Phase | Branch                       | Deliverables                                                                                                                                             |
| ----- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | `refactor/claims-based-auth` | `resolveClaimsForLogin`, `doServerActionAs`; existing actions unchanged in behavior; tests                                                               |
| 1     | `feat/codriver-core`         | Runner, fast path, tool registry, read tools, map and mode tools, validation, CLI harness, mocked tests                                                  |
| 2     | `feat/codriver-ingame`       | Internal route and token, `/co` command in the GBX service, confirmation flow, reply templates                                                           |
| 3     | `feat/codriver-settings`     | Prisma models for both providers, encryption helper, operator page and access rules, shared key, server Codriver tab, budget enforcement, usage tracking |
| 4     | `feat/codriver-admin-tools`  | Player, plugin, server and chat tools with confirmations; `codriver:action` event                                                                        |
| 5     | `feat/codriver-panel`        | Panel chat box, usage view, history table, eval script and dataset                                                                                       |
| Later |                              | Manialink confirm buttons, map requests queue, plugin-contributed tools, MCP adapter                                                                     |

### Phase 4 implementation notes

Player, plugin, server settings and announcement tools share the panel's actor-authorized operations and audit logs. Kick and spectator tools allow moderators; bans, guest lists, points, plugins and server settings require admins in Codriver. All targeted player operations enforce the caller's server rank, including panel admin precedence.

Confirmation stores exact player logins and installed plugin IDs. If the target disappears, the caller must ask again. Plugin configuration validates scalar, non-secret fields against the installed manifest; passwords and plugin secrets cannot be changed through Codriver.

Successful mutations emit `codriver:action` with `{tool, args, login}` through the GBX service's existing custom plugin event bus. Read operations and unchanged plugin toggles emit no event. Delivery failures are logged without failing the completed action; `codriver`, `/co` and `/ai` are reserved from plugins.

### Phase 5 implementation notes

The server Codriver page has Chat, Usage, History and Settings tabs. Server members can open chat; the same operator access rules, member switch, roles, cooldown and budgets apply as in game. Settings, usage and history remain server-admin-only. Panel admins have aggregate usage and history tabs under Admin → Codriver.

Panel chat resolves the signed-in caller's current roles for every request, including confirmations. Confirmations expire after 60 seconds and are scoped to server, player and source, so panel confirmation buttons cannot execute an in-game request. Each button also carries a request ID; a stale browser tab cannot confirm a replacement request. Conversation messages live in the current browser tab; durable request records appear in admin history.

Usage shows the current UTC month, requests per day, top tools, key spend, failure rate and escalation rate. Operator breakdowns include servers and current server-group membership; overlapping groups are deliberately not additive. The `modelCalls` migration is supplied for MySQL and PostgreSQL. Existing rows stay null and are excluded from escalation-rate calculations. Deploy the migration with the normal database deployment before using the new usage queries.

History supports status, player-login and free-text filters. “Export draft” downloads a request for manual evaluation review; fill in the original role and server state, correct the expected result and remove private text before adding it to the dataset. No request is automatically added or sent to a model by exporting it.

The evaluation dataset contains 62 English cases covering exact commands, slang, typos, multiple operations, missing targets, permissions and injection attempts. Validate locally without model calls:

```sh
bun run --filter @gcp/web codriver:eval --validate-only
```

Run paid evaluations manually with `ANTHROPIC_API_KEY` set:

```sh
bun run --filter @gcp/web codriver:eval --model haiku --effort low --output /tmp/codriver-haiku.json
bun run --filter @gcp/web codriver:eval --model sonnet --effort medium --output /tmp/codriver-sonnet.json
```

Use `--filter <case-id-substring>` for a subset or `--cases <file>` for a reviewed dataset. The harness uses the real tool schemas, routing, role checks and planner with fixed server-state fixtures. It never prepares targets or executes operations. Tool calls are graded in order with normalized arguments; no-tool refusals and clarifications are checked without an LLM judge. Refusals and clarifications both use the planner's `unclear` status, so their exact wording is not graded. Accuracy, estimated cost, mean/p95 latency and the number of fast-path cases are reported; output files include per-case results. A failed case produces a nonzero exit status. Paid accuracy and latency results are needed before changing the default model.

## 19. Decisions

1. Guests (players without a panel account) have no access until a server admin turns it on.
2. Codriver is a built-in feature, not a marketplace plugin.
3. Server admins may bring their own key if the operator allows it; the panel operator can also set a shared key. The operator enables or disables Codriver per server, group and user (section 5.1).
4. English only.
