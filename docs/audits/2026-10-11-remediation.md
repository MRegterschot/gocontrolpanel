# Audit remediation — 2026-10-11

Branch `security/audit-fixes`, based on `8b483417`. Status of every finding in the Astra report ([`../security-audit-2026-10-11.md`](../security-audit-2026-10-11.md)), each verified against the source before fixing.

## Before merging or deploying

1. **Run the migration** `20261011120000_hetzner_server_host_key` (both providers): `bun run deploy`.
2. **Set `HETZNER_KEY` to at least 32 random characters.** If the current key is shorter, keep it as `HETZNER_KEY_PREVIOUS` so stored tokens and SSH keys still decrypt. Hetzner features fail closed until a valid key is set.
3. **Add the `SSH_KNOWN_HOSTS` repository secret** with the deploy host's `known_hosts` lines, checked out of band. Both deploy workflows now refuse to run without it.
4. **Rotate credentials exposed before this change.** Candidates are Hetzner API tokens and complete file contents in old audit rows (SEC-07). Then decide whether to purge the old audit `details`.
5. **Expect new behavior.** Rebuilt Hetzner servers present a new SSH host key and need `hetzner_servers.hostKeyFingerprint` cleared. Changing a file manager URL to a new origin now asks for its password again.

## Status

| ID      | Status              | Fix                                                                                                                                                                                                                                                                                              |
| ------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SEC-01  | Fixed               | `e895416c`: escaping TM formatter in `lib/tmtags.ts`, http(s)-only links, lint rule against direct `tmtags` imports                                                                                                                                                                              |
| SEC-02  | Fixed               | `b16d7dac`: strict schemas in `lib/admin-inputs.ts`; Prisma data built from parsed fields in server, chat config, group, user, role and project actions                                                                                                                                          |
| SEC-03  | Fixed               | `b16d7dac`: linking or unlinking a group server requires admin authority over that server                                                                                                                                                                                                        |
| SEC-04  | Fixed               | `6fd88b9c`: match deletion matched on server and id, in one transaction                                                                                                                                                                                                                          |
| SEC-05  | Fixed               | `b16d7dac`: provisioning authorizes the panel server/group before any cloud call                                                                                                                                                                                                                 |
| SEC-06  | Fixed               | `6bc5dc12`: audit read and delete scope is Admin-only; deletions are audited                                                                                                                                                                                                                     |
| SEC-07  | Fixed (new writes)  | `b16d7dac`, `6bc5dc12`: tokens and file contents no longer logged. Historical rows need cleanup (see above)                                                                                                                                                                                      |
| SEC-08  | Accepted design     | `6bc5dc12` + follow-up: credentials in Hetzner labels and the recent-server cache are intentional and readable by project moderators and admins; only users with nothing beyond global `hetzner:servers:view` get labels without passwords                                                       |
| SEC-09  | Fixed               | `bd38674b`: `fetchPublic`, https host names only, private ranges blocked at connect time, every redirect re-checked                                                                                                                                                                              |
| SEC-10  | Fixed               | `b16d7dac`: an origin change needs a new password; the old token is never sent elsewhere                                                                                                                                                                                                         |
| SEC-11  | Fixed               | `4599e7bf`: `{{sh}}`/`{{env}}` helpers, enum checks before cloud calls                                                                                                                                                                                                                           |
| SEC-12  | Fixed               | `8cbd1b1c`: key of at least 32 characters for new values, fail-closed decryption, `HETZNER_KEY_PREVIOUS`                                                                                                                                                                                         |
| SEC-13  | Fixed               | `8cbd1b1c`: `crypto.getRandomValues` without modulo bias                                                                                                                                                                                                                                         |
| SEC-14  | Fixed               | `05ab4df3`: SSH host key pinned on first use (Hetzner publishes none, so the first connection is still trust-on-first-use); deploys use `SSH_KNOWN_HOSTS` with strict checking                                                                                                                   |
| SEC-15  | **Open**            | Needs a decision: the panel reaches XML-RPC and the file manager over public IPs, possibly from outside Hetzner. Options: Hetzner Cloud Firewall limited to the panel's egress IP, a private network, or TLS in front of the file manager                                                        |
| SEC-16  | Fixed               | `073b77d5`: sockets end after about 10 minutes (code 4001); the client reconnects at once with a fresh ticket                                                                                                                                                                                    |
| SEC-17  | Fixed               | `b2f634db`: Server Action limit 10 MB; uploads use an authorized route that checks before reading the body                                                                                                                                                                                       |
| SEC-18  | Fixed               | `bd38674b`: one deadline and byte cap across the whole body for map, TMX and marketplace downloads                                                                                                                                                                                               |
| SEC-19  | Fixed               | `ac121418`: package templates compile in a worker (5 s, 64 MB heap, at most 200 templates)                                                                                                                                                                                                       |
| SEC-20  | Fixed               | `6fd88b9c`: RFC 4180 quoting and formula neutralization                                                                                                                                                                                                                                          |
| SEC-21  | Fixed               | `6fd88b9c`: soft-deleted matches and records excluded from lists, counts and exports                                                                                                                                                                                                             |
| SEC-22  | Fixed               | `b16d7dac`: omitted relations and tokens are left alone                                                                                                                                                                                                                                          |
| SEC-23  | Fixed               | `b16d7dac`: the file manager is read from the database on every use (no process cache)                                                                                                                                                                                                           |
| SEC-24  | Fixed               | `9fc7697d`: atomic Redis reservation of worst-case cost; overspend is bounded to one request beyond its reservation                                                                                                                                                                              |
| SEC-25  | Partly fixed        | `6fd88b9c`, `9253c082`: admin writes and their audit entry share a transaction. **Open:** service events are published after commit, without an outbox                                                                                                                                           |
| OPS-01  | Fixed               | `4599e7bf`: cloud-init moves `apps/web/hetzner` to the path the scripts use. Provisioning still downloads the mutable `master` archive                                                                                                                                                           |
| HARD-01 | Fixed (partial CSP) | `b2f634db`: frame-ancestors, nosniff, referrer policy, permissions policy, HSTS. `script-src` isn't restricted yet; that needs nonces                                                                                                                                                            |
| DEP-01  | Mostly fixed        | `7d4d520b`: next 16.3.8, next-auth 4.24.15, handlebars 4.7.10, axios 1.20.0, ws 8.22.0, plus overrides. `bun audit` goes from 124 to 48 matches, the rest in dev/build tooling or low-reachability transitive paths (uuid via next-auth/slugid, lodash via recharts, postcss/nanoid inside next) |

These overlapping items from the Claude report were fixed along the way: CL-02, CL-03, CL-05, CL-06, CL-08, CL-09 and CL-16. **Still open from that report:** CL-04 (deleted users are recreated by the JWT callback), CL-07 (plaintext XML-RPC and file manager passwords), CL-10 to CL-13, CL-15, CL-17, CL-19 and CL-20.

## Verification

- `tsc --noEmit` passes for web, the GBX service and shared. Test suites pass: web 386, GBX service 322, shared 88.
- `next build --webpack` and the GBX `tsup` build succeed on the upgraded dependencies.
- New regression tests cover:
  - `tmtags`
  - admin actions: mass assignment, group server links, user delegation, partial updates, match scoping, audit scope
  - CSV, file manager URLs and audit redaction
  - Hetzner crypto
  - provisioning templates, rendered with hostile values and read back by bash
  - SSH pinning, against an in-process ssh2 server
  - private-address rules
  - socket lifetime on both sides
  - worker template compilation
  - Codriver reservations
- The Redis reservation scripts were also run once against a disposable Redis 7. That test isn't committed because it needs Redis.
- Not verified: real Hetzner provisioning, real dedicated servers, a browser session against the deployed panel, or the deploy workflows.
