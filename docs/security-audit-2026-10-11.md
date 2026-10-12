# Security and reliability audit — 2026-10-11

Audited revision: `8b48341785536a5dbb901f7eef158b1805bbddd8`.

This report records a security-focused source audit of the web panel, GBX service, shared authorization/contracts, both Prisma schemas, plugin sandbox and marketplace, Codriver, Hetzner provisioning, and deployment/CI configuration. It is a prioritized remediation backlog, not a certification that all vulnerabilities have been found. Application code was not changed.

## Priorities and evidence

| Priority | Meaning                                                                                                                                |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Emergency: demonstrated active compromise or an immediately exploitable catastrophic deployment issue. None established in this audit. |
| P1       | High: fix before exposing this installation to untrusted players or delegated operators; urgent dependency triage.                     |
| P2       | Medium: schedule next; constrained security exposure, resource exhaustion, or substantial correctness/recovery risk.                   |
| P3       | Low: hardening with deployment-dependent impact.                                                                                       |

Priority reflects remediation urgency, prerequisites and blast radius; it is not a CVSS score. “Source-confirmed” means the code path is present, not that a production exploit was executed. Mocked probes verify action control/data flow without exercising Prisma or an authenticated HTTP transport. Dependency alerts have their own upstream severities and remain separate from application findings.

The most consequential chains are player-supplied HTML executing in an operator’s browser (SEC-01), a server admin injecting relational database writes (SEC-02), a group admin acquiring a foreign server (SEC-03), and overly broad audit access exposing plaintext secrets (SEC-06 + SEC-07). Fix those trust boundaries together with the other P1 items.

## Findings index

**28 findings:** 14 P1, 13 P2, 1 P3. Dependency alert details are listed separately in the appendix.

| ID      | Priority | Category                           | Finding                                                                        |
| ------- | -------- | ---------------------------------- | ------------------------------------------------------------------------------ |
| SEC-01  | P1       | Browser and export injection       | Untrusted Trackmania text renders as executable HTML                           |
| SEC-02  | P1       | Authorization and tenant isolation | Server editing accepts nested Prisma writes outside the intended form          |
| SEC-03  | P1       | Authorization and tenant isolation | Group administrators can attach servers they do not administer                 |
| SEC-04  | P1       | Authorization and tenant isolation | Match deletion authorizes one server but deletes another server’s match        |
| SEC-05  | P1       | Authorization and tenant isolation | Hetzner provisioning can overwrite unrelated panel servers and groups          |
| SEC-06  | P1       | Authorization and tenant isolation | Audit-log scope includes ordinary memberships and public groups                |
| SEC-07  | P1       | Secrets and cryptography           | Audit logs persist plaintext cloud API tokens and complete edited files        |
| SEC-08  | P1       | Secrets and cryptography           | Hetzner labels and recent-server responses reveal privileged credentials       |
| SEC-09  | P1       | Network and integration boundaries | Map download accepts arbitrary server-side request destinations                |
| SEC-10  | P1       | Network and integration boundaries | Changing a file-manager URL sends its existing secret to the new host          |
| SEC-11  | P2       | Network and integration boundaries | Provisioning interpolates form fields into root shell scripts                  |
| SEC-12  | P1       | Secrets and cryptography           | Hetzner encryption silently accepts an empty or weak key                       |
| SEC-13  | P2       | Secrets and cryptography           | Generated infrastructure passwords use Math.random                             |
| SEC-14  | P2       | Network and integration boundaries | SSH connections do not authenticate the remote host                            |
| SEC-15  | P1       | Deployment and transport           | Provisioned management services are publicly bound and use plaintext transport |
| SEC-16  | P2       | Authorization and tenant isolation | Open WebSockets keep revoked permissions indefinitely                          |
| SEC-17  | P1       | Availability and resource limits   | Global Server Action request limit is one gigabyte                             |
| SEC-18  | P2       | Availability and resource limits   | Outbound downloads buffer bodies before enforcing limits                       |
| SEC-19  | P2       | Plugin isolation and supply chain  | Plugin template compilation runs outside sandbox resource limits               |
| SEC-20  | P2       | Browser and export injection       | CSV exports allow formula injection and malformed rows                         |
| SEC-21  | P2       | Data lifecycle and correctness     | Deleted matches and records remain available through export                    |
| SEC-22  | P2       | Data lifecycle and correctness     | Partial updates erase omitted memberships and API tokens                       |
| SEC-23  | P2       | Data lifecycle and correctness     | File-manager cache survives removal and password-only changes incorrectly      |
| SEC-24  | P2       | Availability and resource limits   | Codriver budgets can be overspent by concurrent requests                       |
| SEC-25  | P2       | Data lifecycle and correctness     | Business mutations and their audit entries are not atomic                      |
| OPS-01  | P2       | Deployment and transport           | Provisioning scripts still assume the pre-workspace Hetzner directory          |
| HARD-01 | P3       | Browser and export injection       | Repository does not configure browser security headers                         |
| DEP-01  | P1       | Plugin isolation and supply chain  | Locked dependencies match published security advisories                        |

## Browser and export injection

### SEC-01 — P1 — Untrusted Trackmania text renders as executable HTML

**Evidence status:** Locally reproduced parser output; source-confirmed sink.

**Location:** [`live-chat.tsx:101`](../apps/web/src/components/live/live-chat.tsx#L101), [`game-event-handler.ts:260`](../apps/gbx-service/src/core/server/game-event-handler.ts#L260), and the many `parseTmTags` / `dangerouslySetInnerHTML` call sites in map, player, record and Nadeo views. The installed `tmtags` version is 1.0.3.

**Finding and prerequisites:** A player can supply chat text; map names and nicknames provide additional external inputs. The callback forwards chat text without HTML escaping. A local probe returned `<img src=x onerror=alert(1)>` unchanged from `parseTmTags`; `$l[javascript:alert(1)]click$l` produced a JavaScript URL. Rendering this output creates an XSS sink in an authenticated operator’s panel. JavaScript can act with the victim’s permissions even when cookies are HttpOnly. Browser execution against a live game was not performed.

**Recommended fix:** Render formatting as React elements, or sanitize the parser’s final HTML with a strict tag/attribute/protocol allowlist. Escape raw text and reject executable link schemes. Apply the fix centrally to every formatting call site; a CSP is additional protection, not the primary fix.

**Regression check:** Render raw tags, event attributes, malformed tags, single-quote URL attribute injection, and JavaScript/data URLs in chat, nicknames and map names; assert no executable DOM or unsafe links remain.

### SEC-20 — P2 — CSV exports allow formula injection and malformed rows

**Evidence status:** Source-confirmed.

**Location:** [`matches.ts:176`](../apps/web/src/services/database/matches.ts#L176), `exportMatchToCSV`.

**Finding and prerequisites:** Map names and player nicknames are concatenated with `join(",")`, without CSV quoting or spreadsheet formula neutralization. Commas, quotes and newlines corrupt the export; attacker-controlled names starting with formula characters can be interpreted by spreadsheet applications when an operator opens the file. Exact formula execution depends on the spreadsheet and its settings.

**Recommended fix:** Use a CSV serializer with proper quoting and explicit formula escaping for untrusted textual cells; preserve numeric time/points types.

**Regression check:** Export names containing commas, quotes, CR/LF and formula prefixes; round-trip parse the CSV and verify spreadsheet-safe textual output.

### HARD-01 — P3 — Repository does not configure browser security headers

**Evidence status:** Deployment-dependent hardening gap.

**Location:** [`next.config.ts`](../apps/web/next.config.ts); no CSP/frame-ancestor policy was found in web source or included reverse-proxy configuration.

**Finding and prerequisites:** The repository lacks an application-defined Content-Security-Policy and clickjacking defense for authenticated management pages. A production proxy may supply them; actual deployment response headers were not inspected. This is defense-in-depth work, separate from the confirmed XSS sink.

**Recommended fix:** Roll out a compatible CSP, including `frame-ancestors`, and explicit content-type/referrer policy headers at the application or documented proxy boundary. Start with report-only CSP if necessary.

**Regression check:** Inspect authenticated deployed responses and exercise scripts, WebSockets and dialogs under the enforced policy.

## Authorization and tenant isolation

### SEC-02 — P1 — Server editing accepts nested Prisma writes outside the intended form

**Evidence status:** Mocked-action reproduction; database escalation inferred from schema.

**Location:** [`servers.ts:98`](../apps/web/src/actions/database/servers.ts#L98), especially `...rest` / `...scalarFields` at lines 132–141; [`schema.prisma:167`](../packages/db/prisma/mysql/schema.prisma#L167). Similar unrestricted spreads exist in user, group, role and project actions.

**Finding and prerequisites:** A direct server Admin can call `updateServer` with fields omitted only by TypeScript. Runtime objects retain relation fields such as `records`, `groupServers` and `serverPlugins`. A mocked-action probe confirmed that `records.update.data.user.update.admin = true` reaches Prisma unchanged. Given a record on that server associated with an attacker-controlled user, the schema permits a nested write to the global user admin flag. This is a potential panel-wide privilege escalation, not just editing extra server settings. The nested database write itself was not executed in this audit.

**Recommended fix:** Parse strict action-specific input schemas, explicitly construct allowed scalar writes, and keep relation updates in separately authorized code. Never spread caller objects into Prisma `data`. Audit all legacy create/update actions, not only the demonstrated server action.

**Regression check:** Call the real action with extra relation objects and privilege fields; assert rejection before Prisma. Add an isolated database regression for the server-record-user relation on both providers.

### SEC-03 — P1 — Group administrators can attach servers they do not administer

**Evidence status:** Mocked-action reproduction.

**Location:** [`groups.ts:16`](../apps/web/src/actions/database/groups.ts#L16), [`groups.ts:47`](../apps/web/src/actions/database/groups.ts#L47), and [`permissions.ts`](../packages/shared/src/permissions.ts) `expandPermissions`.

**Finding and prerequisites:** `updateGroup` authorizes administration of the group, then accepts every supplied `groupServers[].serverId`. It never authorizes those servers. A group Admin who knows a foreign server ID can attach it to their group and acquire group-server Admin permissions on the next session read. `createGroup` has the same unchecked server-link behavior for holders of `groups:create`. The filtered server picker does not protect direct action calls.

**Recommended fix:** Require authority over each server added or removed, distinguish global group-management rights from tenant rights, and perform validation and membership changes together.

**Regression check:** As Admin of group A but not server B, attempt linking B through create and update actions. Both must fail and leave membership unchanged.

### SEC-04 — P1 — Match deletion authorizes one server but deletes another server’s match

**Evidence status:** Mocked-action reproduction.

**Location:** [`matches.ts:8`](../apps/web/src/actions/database/matches.ts#L8).

**Finding and prerequisites:** `deleteMatch(serverId, matchId)` checks Moderator/Admin on `serverId`, but updates the match by `id` alone and records by `matchId` alone. A moderator on A who knows a match ID from B can soft-delete B’s match and records. The audit entry misleadingly names A.

**Recommended fix:** Look up the active match using both `serverId` and `matchId`; scope associated records to that server and update them transactionally with the match and audit entry.

**Regression check:** Use two servers and a moderator scoped to only one. A foreign match ID must produce no writes; the legitimate match must delete atomically.

### SEC-05 — P1 — Hetzner provisioning can overwrite unrelated panel servers and groups

**Evidence status:** Source-confirmed.

**Location:** [`server-setup.ts`](../apps/web/src/actions/hetzner/server-setup.ts): `createAdvancedServerSetup` lines 288–350, `createSimpleServerSetup` lines 598–660, and `addTrackmaniaServer` lines 839–901.

**Finding and prerequisites:** The entry points check cloud project/create permissions. Their `updateServer` branches accept an independent panel `serverId` and overwrite its connection credentials without server authorization. Their `groupId` branches add a new server to any referenced group without group authorization. A project operator can redirect another tenant’s managed server or inject membership into an unrelated group. This requires a successful provisioning path, so cloud side effects were not reproduced.

**Recommended fix:** Before any cloud API call, authorize the requested panel create/update operation and group membership change, verify active resources, and bind the operation to validated IDs.

**Regression check:** Mock provisioning success and supply foreign panel server/group IDs; assert rejection before any paid cloud operation or database write.

### SEC-06 — P1 — Audit-log scope includes ordinary memberships and public groups

**Evidence status:** Source-confirmed.

**Location:** [`audit-logs.ts:24`](../apps/web/src/services/database/audit-logs.ts#L24), especially lines 52–83; [`auth.ts`](../apps/web/src/lib/auth.ts) public-group expansion.

**Finding and prerequisites:** The entry check accepts an Admin role anywhere, but the row filter collects every server, group and project membership without filtering its role. Someone administering A and merely a Member/Moderator of B can read B’s audit logs. Public groups are added to sessions as Member groups, so their server logs also enter this scope. SEC-07 makes the exposure potentially include cloud tokens and file contents.

**Recommended fix:** Build separate allowed target IDs using the required Admin role for each target; preserve the explicit global `audit-logs:view` override. Public membership must not imply audit access.

**Regression check:** Test Admin A plus Member B, Moderator project B, and public group B; only A’s logs should be visible.

### SEC-16 — P2 — Open WebSockets keep revoked permissions indefinitely

**Evidence status:** Source-confirmed.

**Location:** [`ws-routes.ts`](../apps/gbx-service/src/http/ws/ws-routes.ts), [`ticket-verifier.ts`](../apps/gbx-service/src/http/ws/ticket-verifier.ts), and [`channels.ts`](../apps/gbx-service/src/http/ws/channels.ts).

**Finding and prerequisites:** Tickets are short-lived and single-use, but claims are checked only at connection establishment. Channels retain the original scope; the heartbeat does not refresh authorization. A removed/demoted user can keep receiving live data, players and notifications while the socket stays connected. Server removal closes per-server sockets, but user/group permission changes do not.

**Recommended fix:** Bound socket lifetime and require a fresh ticket on reconnect, or propagate authorization-version/revocation events that close affected sockets promptly. Ticket expiry alone is not socket expiry.

**Regression check:** Open a connection, revoke membership, then emit events; delivery must stop within a documented short revocation window.

## Secrets and cryptography

### SEC-07 — P1 — Audit logs persist plaintext cloud API tokens and complete edited files

**Evidence status:** Source-confirmed.

**Location:** [`hetzner-projects.ts`](../apps/web/src/actions/database/hetzner-projects.ts) `createHetznerProject` / `updateHetznerProject`; [`filemanager/index.ts:18`](../apps/web/src/actions/filemanager/index.ts#L18); [`files.ts`](../apps/web/src/actions/filemanager/server-only/files.ts) `writeFileTextAs`; [`logAudit`](../apps/web/src/actions/database/server-only/audit-logs.ts).

**Finding and prerequisites:** Token encryption protects the project column, but the same raw project input, including `apiTokens`, is copied to `AuditLogs.details`. File saves similarly log `{path, text}`, which can contain dedicated credentials and plugin/API secrets. Audit readers and backups gain additional plaintext secret copies; SEC-06 expands the readers further. This is not a claim that every edited file contains secrets.

**Recommended fix:** Redact secrets before persistence; log file paths, sizes and hashes rather than contents. Inventory historical audit entries and rotate actually exposed credentials. Add structured redaction for request/error logging as defense in depth.

**Regression check:** Save representative secret-bearing project/file inputs and assert neither the literal secrets nor complete file content occur in audit rows or captured logs.

### SEC-08 — P1 — Hetzner labels and recent-server responses reveal privileged credentials

**Evidence status:** Source-confirmed.

**Location:** [`servers.ts:121`](../apps/web/src/actions/hetzner/servers.ts#L121), [`server-setup.ts`](../apps/web/src/actions/hetzner/server-setup.ts) `authorization.*.password` / `filemanager.password` labels, and [`services/hetzner/servers.ts`](../apps/web/src/services/hetzner/servers.ts) `getHetznerServersPaginated` / `getRecentlyCreatedHetznerServers`.

**Finding and prerequisites:** Provisioning stores database and dedicated-server passwords in cloud labels. Server listing returns the complete labels to project Moderators and `hetzner:servers:view` callers. The recent-server service also permits Moderators and returns cached SuperAdmin and file-manager passwords. These readers can bypass panel role limits through the underlying services. Labels also expose secrets to other cloud users and tooling.

**Recommended fix:** Remove secrets from labels; store encrypted credentials in a dedicated server-side store and return secret-free DTOs. Restrict any necessary credential retrieval to an explicit privileged operation. Rotate passwords previously exposed to lower roles.

**Regression check:** List and fetch recent servers as Moderator and view-only users; assert no credential fields or secret label values are present.

### SEC-12 — P1 — Hetzner encryption silently accepts an empty or weak key

**Evidence status:** Source-confirmed.

**Location:** [`config.ts:7`](../apps/web/src/lib/config.ts#L7), [`hetzner.ts:19`](../apps/web/src/lib/hetzner.ts#L19), and [`hetzner-servers.ts`](../apps/web/src/actions/database/server-only/hetzner-servers.ts).

**Finding and prerequisites:** `HETZNER_KEY` defaults to the empty string and is always hashed into an AES key. Missing configuration therefore encrypts cloud tokens and stored SSH private keys with a publicly reproducible key. The decryption helper also returns stored ciphertext as if it were a token after an authentication failure. Impact requires missing/weak configuration or a decryption failure; production configuration was not inspected.

**Recommended fix:** Use the validated, versioned `encryptSecret` / `decryptSecret` approach, reject missing/weak key configuration when enabling Hetzner, fail closed on decryption errors, and define a migration for legacy ciphertext.

**Regression check:** Test unset/short keys, corrupted ciphertext and changed keys; each must fail without returning the stored value as plaintext.

### SEC-13 — P2 — Generated infrastructure passwords use Math.random

**Evidence status:** Source-confirmed.

**Location:** [`utils.ts:198`](../apps/web/src/lib/utils.ts#L198) and its password-generation calls in [`server-setup.ts`](../apps/web/src/actions/hetzner/server-setup.ts) and [`hetzner/servers.ts`](../apps/web/src/actions/hetzner/servers.ts).

**Finding and prerequisites:** The same non-cryptographic random-string function creates SuperAdmin, file-manager and database credentials. It provides no cryptographic unpredictability guarantee. No practical state-recovery attack or guessed credential was demonstrated.

**Recommended fix:** Use `crypto.randomBytes` or `crypto.randomInt` with sufficient entropy; distinguish non-secret identifiers from security credentials.

**Regression check:** Check all credential-generation call sites use the cryptographic generator; do not use statistical randomness tests as a security proof.

## Network and integration boundaries

### SEC-09 — P1 — Map download accepts arbitrary server-side request destinations

**Evidence status:** Source-confirmed.

**Location:** [`actions/nadeo/maps.ts:14`](../apps/web/src/actions/nadeo/maps.ts#L14) and [`api/nadeo.ts:359`](../apps/web/src/lib/api/nadeo.ts#L359).

**Finding and prerequisites:** An authenticated server Moderator/Admin can pass an arbitrary URL to `downloadMapFromUrl`. After a file-manager health check, `downloadFile` calls `fetch(url)` without origin/IP restrictions and follows redirects. This permits requests into the panel’s reachable private network or metadata endpoints. Moderators hit the request before the later admin-only upload check; admins can also retrieve downloaded response content through the file manager. No live internal targets were contacted.

**Recommended fix:** Prefer a map identifier resolved to a trusted upstream URL. If arbitrary URLs are necessary, restrict schemes/origins and validate actual resolved destinations and every redirect. Block loopback, private/link-local and metadata ranges, with explicit exceptions only for operator-configured infrastructure.

**Regression check:** Use local fake upstreams and DNS fixtures to test loopback, private IPv4/IPv6, redirects and DNS rebinding. Assert rejected URLs make no outbound request.

### SEC-10 — P1 — Changing a file-manager URL sends its existing secret to the new host

**Evidence status:** Source-confirmed.

**Location:** [`servers.ts:164`](../apps/web/src/actions/database/servers.ts#L164) and [`file-manager.ts:79`](../apps/web/src/lib/managers/file-manager.ts#L79).

**Finding and prerequisites:** A direct server Admin may change `filemanagerUrl` without supplying a new password. `updateServer` then calls `updateFileManager(newUrl, originalPassword)`, which immediately sends the existing bearer credential to the new host’s `/health`. This defeats the deliberate omission of passwords from server edit responses. Arbitrary URL configuration also gives these users an SSRF route. Private file-manager addresses may be legitimate; credential forwarding on origin changes is the specific flaw.

**Recommended fix:** On origin change, require an explicitly supplied replacement credential or separate privileged migration flow; never reuse the old secret automatically. Validate destinations against an operator-controlled infrastructure allowlist.

**Regression check:** Change only the URL to a recording fake endpoint and assert the old bearer secret is never transmitted.

### SEC-11 — P2 — Provisioning interpolates form fields into root shell scripts

**Evidence status:** Source-confirmed.

**Location:** [`database-init.sh.hbs:8`](../apps/web/hetzner/database-init.sh.hbs#L8), [`server-init.sh.hbs`](../apps/web/hetzner/server-init.sh.hbs), and [`actions/hetzner/servers.ts:95`](../apps/web/src/actions/hetzner/servers.ts#L95).

**Finding and prerequisites:** Database type/name/user/password values are inserted using raw Handlebars interpolation into double-quoted shell assignments and Docker arguments; command substitution is active in double quotes. Dedicated-server templates also embed fields in fixed-delimiter heredocs. The actions rely on TypeScript form types and do not parse the schemas server-side. A provisioning-authorized caller can inject shell syntax into root cloud-init execution. This is scoped to infrastructure they can provision; a panel-host RCE was not established.

**Recommended fix:** Use validated enums and bounded schemas, serialize configuration as data, and pass secrets without constructing shell source. If shell is unavoidable, use context-correct quoting and prevent heredoc delimiter injection.

**Regression check:** Render hostile quotes, newlines, command substitutions and heredoc delimiters into inert test templates; verify they remain data. Do not execute the real provisioning script for this test.

### SEC-14 — P2 — SSH connections do not authenticate the remote host

**Evidence status:** Source-confirmed.

**Location:** [`ssh.ts:33`](../apps/web/src/lib/ssh.ts#L33), [production deployment workflow](../.github/workflows/deploy-production.yml), and [staging deployment workflow](../.github/workflows/deploy-staging.yml).

**Finding and prerequisites:** The SSH client provides no `hostVerifier`; installed ssh2 documentation explicitly says this auto-accepts host keys. CI performs an unauthenticated `ssh-keyscan` and also uses `StrictHostKeyChecking=no`. A network-positioned attacker can impersonate the remote endpoint, receive provisioning script contents, or falsify deployment output. Private-key authentication does not itself disclose the client private key.

**Recommended fix:** Pin expected host keys/fingerprints through a trusted provisioning channel, reject changes, and use strict verification in CI. Define how replacement hosts acquire a new approved fingerprint.

**Regression check:** Connect to a fake server with a mismatched host key and assert rejection before scripts or deployment commands are sent.

## Deployment and transport

### SEC-15 — P1 — Provisioned management services are publicly bound and use plaintext transport

**Evidence status:** Source-confirmed.

**Location:** [`hetzner/docker-compose.yml`](../apps/web/hetzner/docker-compose.yml), its controller variants, [`database-init.sh.hbs`](../apps/web/hetzner/database-init.sh.hbs), and `http://${cachedServer.ip}` assignments in [`server-setup.ts`](../apps/web/src/actions/hetzner/server-setup.ts).

**Finding and prerequisites:** Generated configurations publish XML-RPC and the file manager on all interfaces, and the panel stores public-IP HTTP file-manager URLs carrying bearer passwords and file contents. Standalone database scripts also publish database ports; creation enables public IPv6. No firewall attachment is specified in these creation payloads. Exposure depends on external firewall/network policy, which was not inspected; root development Compose correctly binds its management dependencies to loopback.

**Recommended fix:** Use private networking or a tunnel for management, authenticated TLS for file access, and cloud/host firewall rules limiting management ports to the panel/service. Keep public game ports separate. Restrict database listeners to the intended private interface.

**Regression check:** Inspect generated plans and a disposable deployment from an external host: management ports must be unreachable or TLS-protected and restricted; game connectivity must remain functional.

### OPS-01 — P2 — Provisioning scripts still assume the pre-workspace Hetzner directory

**Evidence status:** Source-confirmed.

**Location:** [`server-init.sh.hbs:9`](../apps/web/hetzner/server-init.sh.hbs#L9), [`add-server.sh.hbs:5`](../apps/web/hetzner/add-server.sh.hbs#L5), and `deleteTrackmaniaServer` in [`server-setup.ts`](../apps/web/src/actions/hetzner/server-setup.ts).

**Finding and prerequisites:** Setup downloads the current repository archive but changes directory to `gocontrolpanel-master/hetzner`; this checkout stores those assets under `apps/web/hetzner`. Add/delete/restart paths repeat the old location. With an archive matching the audited tree, fresh cloud-init exits before deployment after the VM has already been created. Existing hosts may still contain the legacy layout. No paid cloud provisioning was performed.

**Recommended fix:** Package versioned provisioning assets at a stable location, fix paths consistently, and avoid downloading a mutable branch at provisioning time.

**Regression check:** Extract a source archive matching the release in a disposable filesystem and validate every referenced provisioning path before running cloud operations.

## Availability and resource limits

### SEC-17 — P1 — Global Server Action request limit is one gigabyte

**Evidence status:** Source-confirmed.

**Location:** [`next.config.ts:52`](../apps/web/next.config.ts#L52).

**Finding and prerequisites:** Every Server Action inherits `bodySizeLimit: "1gb"`, including tiny administrative mutations. Large/concurrent action requests can consume substantial decoding memory before application-level validation and authorization. The exact unauthenticated request path and reverse-proxy limits were not exercised; the repository configuration itself removes an important resource boundary.

**Recommended fix:** Restore a small global limit; implement separately authorized streaming uploads with per-file, total-size, concurrency and proxy limits.

**Regression check:** Check oversized action requests are rejected early, and run bounded memory/concurrency checks in a disposable environment rather than attempting a gigabyte allocation here.

### SEC-18 — P2 — Outbound downloads buffer bodies before enforcing limits

**Evidence status:** Source-confirmed.

**Location:** [`api/nadeo.ts:359`](../apps/web/src/lib/api/nadeo.ts#L359), [`marketplace.ts:38`](../apps/web/src/lib/marketplace.ts#L38), and [`index-source.ts`](../apps/gbx-service/src/infra/marketplace/index-source.ts).

**Finding and prerequisites:** Map downloads clear their timeout as soon as headers arrive and then call `arrayBuffer()` with no size cap. A slow/endless body can hold the request and grow memory. Web marketplace downloads check actual size only after buffering; the service marketplace reader buffers all text before checking length. Content-Length can be omitted or inaccurate. Marketplace abuse requires a malicious/compromised configured upstream; map URLs are directly caller-controlled under SEC-09.

**Recommended fix:** Keep deadlines active through body consumption and stream with a byte counter that cancels immediately at the limit. Apply aggregate download/concurrency limits.

**Regression check:** Use chunked responses with no length header, an oversized body, and a response that sends headers then stalls; assert early cancellation and bounded memory.

### SEC-24 — P2 — Codriver budgets can be overspent by concurrent requests

**Evidence status:** Source-confirmed.

**Location:** [`handle.ts:240`](../apps/web/src/lib/codriver/handle.ts#L240), [`usage.ts:71`](../apps/web/src/lib/codriver/usage.ts#L71), and [`pending.ts`](../apps/web/src/lib/codriver/pending.ts) `takeCooldown`.

**Finding and prerequisites:** Budget checks sum already-recorded usage before a model call, while usage is persisted after completion. There is no budget reservation in this path. Cooldowns are keyed by server/login, so different users/servers sharing a key can simultaneously pass the same remaining global budget. One in-flight request may also exceed the remaining amount. This is a spending-limit weakness, not a demonstrated unauthorized tool execution.

**Recommended fix:** Atomically reserve a conservative request allowance in every applicable budget scope, reconcile actual usage, and limit shared-key concurrency. Clearly state whether configured budgets are hard limits or approximate thresholds.

**Regression check:** Race multiple requests against a small shared remaining budget using a fake model; total admitted reservations must not exceed the intended cap.

## Plugin isolation and supply chain

### SEC-19 — P2 — Plugin template compilation runs outside sandbox resource limits

**Evidence status:** Source-confirmed.

**Location:** [`templates.ts:6`](../apps/gbx-service/src/core/plugins/sandbox/templates.ts#L6) and [`package-loader.ts`](../apps/gbx-service/src/core/plugins/sandbox/package-loader.ts).

**Finding and prerequisites:** Uploaded template strings are synchronously passed to host-process `Handlebars.precompile` before QuickJS execution. The VM’s CPU/memory budgets cannot interrupt this work. Package-size limits bound input bytes but not compiler complexity or native-host failure impact. This is a resource-isolation gap; no QuickJS escape or host code-execution exploit was demonstrated. The locked compiler also has advisories (DEP-01).

**Recommended fix:** Compile untrusted templates in a disposable worker/process with a deadline and memory budget; limit template count/depth and use a patched compiler. Keep generated-code execution inside QuickJS.

**Regression check:** Use adversarial templates in a disposable worker test and verify the parent service remains responsive when compilation exceeds its budget.

### DEP-01 — P1 — Locked dependencies match published security advisories

**Evidence status:** Scanner-confirmed version matches; individual exploitability not established.

**Location:** [`bun.lock`](../bun.lock), [complete dependency appendix](audits/2026-10-11-dependencies.md), and [captured scanner output](audits/2026-10-11-dependencies.json).

**Finding and prerequisites:** `bun audit --json` results were intersected with exact lockfile versions: 124 advisory-range matches across 28 packages, representing 115 unique advisory URLs. Severity counts per matched row are 7 critical, 63 high, 50 moderate and 4 low. These are dependency alerts, not 124 proven exploitable application flaws. Runtime priorities include Next.js 16.3.0, Handlebars 4.7.8, ws 8.19.0, Axios 1.15.0/1.13.6 and next-auth 4.24.13. Some findings concern optional/dev-only features; for example, the Windows-only Next.js issue does not establish exposure in the Linux Docker deployment, and the Auth.js email issue does not establish exposure with the Nadeo-only provider.

**Recommended fix:** Triage runtime reachability first, upgrade direct and transitive dependencies to releases fixing all applicable advisories, regenerate the lockfile, and rerun tests/builds for both DB providers. Add a dependency-advisory CI check with documented, expiring exceptions. Do not automatically equate upstream severity with this deployment’s exploitability.

**Regression check:** Rerun the scan on the updated exact lockfile and investigate each remaining alert. Test plugin compilation, image optimization, OAuth and WebSocket behavior after upgrades.

## Data lifecycle and correctness

### SEC-21 — P2 — Deleted matches and records remain available through export

**Evidence status:** Source-confirmed.

**Location:** [`matches.ts:151`](../apps/web/src/services/database/matches.ts#L151), `exportMatchToCSV`, and `matchesMapRecordsSchema` near the top of the same file.

**Finding and prerequisites:** The export correctly scopes the match by `serverId`, but does not require `deletedAt: null` on the match or its included records. A permitted server member with an old match ID can export data removed through soft deletion. The paginated list filters matches but its included records also lack a deletion filter. This is a lifecycle inconsistency, not an unscoped cross-server export.

**Recommended fix:** Apply active-row filters consistently to parent matches, included records, counts and CSV export. If historical/deleted data is intentionally accessible, make it an explicitly authorized feature.

**Regression check:** Soft-delete a match and a subset of another match’s records; neither should leak through ordinary lists/counts/export.

### SEC-22 — P2 — Partial updates erase omitted memberships and API tokens

**Evidence status:** Source-confirmed.

**Location:** [`groups.ts:65`](../apps/web/src/actions/database/groups.ts#L65), [`servers.ts:142`](../apps/web/src/actions/database/servers.ts#L142), and [`hetzner-projects.ts:64`](../apps/web/src/actions/database/hetzner-projects.ts#L64).

**Finding and prerequisites:** These actions accept `Partial` inputs but always issue relation `deleteMany: {}` even when replacement memberships are absent. A name-only group/server/project update can remove access memberships; a project update also normalizes missing `apiTokens` to an empty list. This can lock out operators or disconnect cloud integration.

**Recommended fix:** Leave omitted properties untouched; replace relations/tokens only when the caller explicitly includes them. Validate the full replacement before committing.

**Regression check:** Run name-only updates and assert memberships, server links and encrypted tokens remain identical. Explicit empty lists should have separately tested semantics.

### SEC-23 — P2 — File-manager cache survives removal and password-only changes incorrectly

**Evidence status:** Source-confirmed.

**Location:** [`file-manager.ts:79`](../apps/web/src/lib/managers/file-manager.ts#L79) and [`servers.ts:154`](../apps/web/src/actions/database/servers.ts#L154).

**Finding and prerequisites:** `updateFileManager` returns early on a missing/empty URL without evicting the existing process cache. Clearing a stored URL therefore leaves a previously cached manager usable. Password-only partial updates pass the omitted URL rather than the stored URL, so they also skip updating cached credentials. The database and actual outbound connection can disagree until process restart.

**Recommended fix:** Compute the effective URL/password from the old row and validated patch; always invalidate/replace the cache after saving, including explicit removal. Consider shared invalidation across web replicas.

**Regression check:** Populate the cache, remove the URL, and verify later reads fail; rotate only the password and verify the next request uses the new credential.

### SEC-25 — P2 — Business mutations and their audit entries are not atomic

**Evidence status:** Source-confirmed.

**Location:** [`matches.ts:22`](../apps/web/src/actions/database/matches.ts#L22), [`groups.ts`](../apps/web/src/actions/database/groups.ts), and [`servers.ts`](../apps/web/src/actions/database/servers.ts).

**Finding and prerequisites:** Match deletion performs separate match, record and audit writes. Many other actions commit business writes before an audit insert or event publication. Failure halfway leaves partial deletion or a successful operation with no audit entry while the UI sees an error; retries can repeat external work. This weakens both recovery and audit completeness.

**Recommended fix:** Use database transactions for related database changes and audit inserts, plus a transactional outbox for service notifications. Make external operations idempotent and expose partial outcomes accurately.

**Regression check:** Inject failures between each step and assert rollback or a durable, retryable outbox entry; a failed response must not silently hide a committed unaudited change.

## Verification performed

- Web unit suite: `bun run --filter @gcp/web test` — **32 files, 350 tests passed**.
- GBX service unit suite: `bun run --filter @gcp/gbx-service test` — **32 files, 317 tests passed**.
- Shared package unit suite: `bun run --filter @gcp/shared test` — **9 files, 85 tests passed**.
- A local Node probe against installed `tmtags` reproduced raw HTML and unsafe link output. The raw-tag reproduction is:

  ```js
  const { parseTmTags } = require("tmtags");
  console.log(parseTmTags("<img src=x onerror=alert(1)>"));
  // <img src=x onerror=alert(1)>
  ```

- Temporary mocked-action probes loaded the actual TypeScript action bodies with stubbed authentication/database dependencies. They confirmed: foreign match ID reaches an update with no server predicate; a foreign server ID reaches group membership creation; and the injected nested `records` update survives server input handling. These probes did not connect to a database and did not establish SQL-level execution or test the Next.js action wire protocol.
- Dependency scan: Bun 1.3.5, `bun audit --json`; exact locked versions were matched against the returned vulnerable ranges using `semver`. All raw package advisory results are retained, including ranges that do not match a locked version; the Markdown appendix contains only matching rows.
- Changed documentation was formatted with installed Prettier; relative file links and `git diff --check` were checked.

Passing existing tests does not disprove the findings. The regression checks above are proposed acceptance criteria for fixes, not claims that those security tests already exist.

## Controls observed working in the reviewed paths

- Internal GBX routes register shared-token authentication. Ticket signing/verification fixes issuer, audience and HS256 and validates claims; tickets are short-lived and the verifier rejects reuse within the running service instance.
- ECM submission uses admin permissions and checks match/server/record ownership, validates inputs, and avoids logging credential-bearing Axios errors.
- The plugin runtime uses QuickJS/WASM with memory, stack, CPU, handler, timer and API quotas, explicit capabilities and GBX method restrictions. Plugin HTTP uses HTTPS, hostname capability checks, connection-time DNS private-address checks, response limits and deadlines. No sandbox escape was demonstrated.
- Package loading checks hashes and manifest compatibility. Plugin configuration handles secret redaction separately. These protections do not cover host-side template compilation described above.
- Codriver builds actors from server-side identities, rechecks permissions for tools, and atomically consumes pending confirmations. No prompt-injection permission bypass was established during this review.
- Shared GET wrappers require sessions and disable shared response caching; notification updates are scoped to the authenticated user. Server edit/list payloads deliberately omit dedicated/file-manager passwords, though SEC-10 defeats that boundary through outbound forwarding.
- The development Compose file binds database, Redis, XML-RPC and file-manager ports to loopback. The public bindings finding concerns generated cloud provisioning configurations.

## Boundaries and follow-up review

No production host, real game server, cloud account or user data was probed. No database was reset, migrated or modified. No paid cloud resources were created. Live browser execution, production security headers, firewall rules, secret strength, backup access controls, and multi-instance deployment behavior were not verified. Typechecks and builds were not rerun for this documentation-only change; the relevant existing unit suites were run as audit evidence.

The separate file-manager implementation, first-party plugin registry repository, dedicated-server binaries, container image contents and external provider internals were outside this checkout. In particular, forwarded file paths alone do not prove a filesystem traversal in the external file manager. A separate authenticated review should test its path/symlink confinement and download content headers. The plugin compiler isolation issue is not evidence that generated template JavaScript escapes QuickJS.

Review deployment secret storage and rotation, database/Redis network ACLs, dependency reachability, provisioning scripts on disposable infrastructure, and object-level authorization with real database fixtures next. Also verify historical audit cleanup and credential rotation after fixing disclosure paths; preventing new disclosures does not remove existing copies.

## Remediation order

1. Close XSS, relational mass assignment, foreign-server linking/deletion/provisioning, and audit-log authorization gaps. Add negative tests for two tenants and different roles.
2. Stop secret copies and old-secret forwarding; harden Hetzner key validation and management transport. Rotate credentials where exposure is confirmed.
3. Triage and update vulnerable runtime dependencies; separate template compilation from the service process. Reduce request limits and bound all download bodies.
4. Address revocation, spending concurrency, CSV safety, lifecycle consistency, partial-update semantics, cache invalidation, transaction/outbox handling and provisioning paths.
5. Verify deployed browser policies and add recurring security regression and advisory checks.

## Reference guidance

The code evidence above determines the findings. These primary references support the remediation approach:

- Use explicit input allowlists and separate editable DTOs: [OWASP Mass Assignment Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html).
- Check authorization for the requested resource and operation: [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).
- Encode untrusted output and sanitize intentionally rendered HTML: [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html).
- Next.js’s maintainer advisory reports AVIF image-optimization RCE in affected versions and identifies 16.3.3 as a fix for that specific issue. This repository locks 16.3.0, but attacker-controlled AVIF reachability was not demonstrated: [GHSA-2xp9-vwfh-vxw4](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4).
- Host-side template compilation and live sockets warrant prioritizing the maintainer advisories for [Handlebars compiler denial of service](https://github.com/handlebars-lang/handlebars.js/security/advisories/GHSA-9cx6-37pm-9jff) and [ws memory exhaustion](https://github.com/websockets/ws/security/advisories/GHSA-96hv-2xvq-fx4p). These links do not establish that every related upstream advisory is exploitable here.
