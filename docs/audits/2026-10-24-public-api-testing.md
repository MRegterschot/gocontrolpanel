# Public API local verification — 2026-10-24

Continued Claude's local `/api/v1` testing against the running web panel,
GBX service, Trackmania dedicated server, and file manager. The changes already
in the working tree were preserved and verified.

## Verified live

- Files: folder creation (201), duplicate creation (409 `FileExists`), UTF-8
  write/read, 300 KB binary write/read with identical bytes, rename, listing,
  deletion, and missing-file reads (404). All returned paths were relative to
  UserData. Traversal and malformed base64 were rejected (400).
- Authorization: missing keys were rejected (401), and a server key could not
  access an unrelated server (403).
- Plugins: listing, reload, disabling and restoring the `hello` plugin, saving
  its existing configuration, rejecting a malformed enabled value (400), and
  rejecting nonexistent plugins and marketplace installs (404).
- Dedicated server script plugin: its read endpoint returned 200.
- Settings: vote ratios of 0% and 100% saved and read back correctly. This
  exercises integral XML-RPC doubles, which previously failed when encoded as
  integers. Restored the original settings afterward.
- Players/maps: current-map reads worked; a newly connected fake player's login
  was accepted by the spectator endpoint, then the fake player disconnected.

## Regression coverage and checks

Added coverage for the actual XML-RPC serializer's double/integer output,
encoding through both internal passthrough routes, the next-map allowlist entry,
file-manager error bodies and 404s, the public 409 mapping, fake player logins,
and field validation without a misleading empty-change error. The folder route
test also checks the file manager's relative create path and returned path.

- Web: 695 tests passed across 65 files.
- GBX service: 333 tests passed across 35 files.
- Shared: 329 tests passed across 13 files.
- `bun run typecheck`: all workspaces passed.
- Prettier checks for changed TypeScript/JSON files and `git diff --check` passed.

## Restoration and limits

Settings, the map playlist, and installed plugin state matched Claude's saved
pre-test snapshots. No fake players or Claude/Codex test folders remained in
Maps or MatchSettings. The temporary API key was revoked and soft-deleted;
requests using it returned 401.

Successful marketplace installation, version changes, uninstallation, and
script-plugin writes were not exercised live in this continuation. These paths
remain covered by the automated suites. No production environment, browser
workflow, or long-running reconnect/soak test was exercised.

## Command endpoint follow-up

Added `POST /api/v1/servers/{serverId}/commands`, requiring the new
`commands:write` scope. It accepts a command name with an optional leading slash
and an ordered `params` array. The shared contract automatically includes the
endpoint in the panel's API reference and OpenAPI document.

```json
{ "command": "help", "params": ["match"] }
```

Commands run as the key's creator through the existing command router, retaining
built-in precedence and normal command permission checks. Parameters containing
spaces remain single arguments. Replies use in-game chat and are also captured
in the response during dispatch. `handled: true` means a handler was found; it
does not promise that the command succeeded. Unknown commands return
`handled: false` with `source: null`.

The response now includes `command`, `login`, `source` (`builtin` or `plugin`),
`messages`, `durationMs`, `messagesTruncated`, and `outputComplete`. Capture
includes broadcasts and private replies to the caller, preserving Trackmania
formatting. Requests are isolated from concurrent commands, other servers,
and unrelated chat. Captured output is limited to 100 messages and 16,384
characters. Plugin callbacks can continue asynchronously; `outputComplete` is
false for plugin commands and replies emitted after dispatch are omitted.

Live checks passed for `/VERSION`, `help` with a plugin name, an unknown command,
invalid parameter types, and the match plugin's `setseeds` command with an
invalid seed (its validation path, without changing seeds). A key with only
`chat:write` and `plugins:write` was denied (403). Audit entries recorded command
names and outcomes without argument values. The temporary key was revoked and
soft-deleted afterward.

Automated coverage verifies command normalization, built-in `co+` syntax,
argument preservation, unknown/unregistered commands, built-in precedence,
caller identity, scope/server/admin enforcement, offline servers, input limits,
and audit redaction. Response coverage also checks actual sandboxed plugin
output, concurrent capture isolation, private-recipient filtering, late replies,
output limits, and unchanged game chat delivery. Live `/version`, `/help match`,
invalid-seed plugin validation, and unknown-command responses included the new
fields as expected. All 1,398 workspace tests and workspace typechecking passed.
