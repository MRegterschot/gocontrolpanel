# First-party plugins

The first-party plugins available to GoControlPanel are ordinary [plugin SDK](./plugin-sdk.md) packages. They run in the same sandbox as marketplace plugins, with only the capabilities they declare. This guide is for contributors who change them or add one.

| Plugin | What it does | Capabilities |
|---|---|---|
| `admin` | `/admin` and a button that notify the server's admins | `ui`, `chat:send`, `notifications` |
| `ecm` | Sends finishes and rounds to eCircuitMania | `ui`, `http:us-central1-fantasy-trackmania.cloudfunctions.net` |
| `live-ranking` | Points standings in rounds, cup and teams | `ui` |
| `live-round` | Live timings of the current round | `ui`, `records:read`, `nadeo:read` |
| `map-info` | Name and author of the current map | `ui`, `maps:read` |
| `match` | Pick and ban, match start and stop, pause, lobby | `ui`, `chat:send`, `maps:read`, `maps:write`, `mode:control` |
| `player-info` | Records, personal bests and setups of the players | `ui`, `records:read`, `nadeo:read` |
| `records-info` | World record and local record of the map | `ui`, `records:read`, `nadeo:read` |
| `ta-active-runs` | Players still driving in time attack | `ui` |
| `ta-leaderboard` | Time attack leaderboard | `ui` |

## Where they live

Plugin source, templates, behavior tests, immutable package archives, and version
metadata live in the [plugin registry repository](https://github.com/MRegterschot/tmcontrolpanel-plugins).
This panel repository keeps the SDK, generic sandbox/runtime tests, and management UI.
The GBX image no longer builds or ships first-party packages.

## How a panel gets them

On startup the GBX service reads `MARKETPLACE_INDEX_URL` (the official registry by
default), selects the newest non-withdrawn version of each first-party plugin, and
downloads it from the index's origin. It validates the checksum and manifest before
storing it as a marketplace package. Existing built-in installs are migrated with
their settings and on/off state preserved. Existing packaged installs keep their
pinned version; admins accept updates and additional permissions in the Plugins UI.

If the registry is unavailable, packages already stored in the database still run.
New installations need registry access to obtain first-party packages. An empty
`MARKETPLACE_INDEX_URL` disables startup imports and marketplace browsing; private
uploads and existing packages continue to work. `FIRST_PARTY_PLUGINS_DIR` is no longer used.

## Settings

First-party plugins don't declare a `configSchema`. The panel keeps its own forms for them (`apps/web/src/forms/server/plugins` and `apps/web/src/components/modals/plugins/plugins`). The Plugins page opens them from **Configure** through [`first-party-settings.tsx`](../apps/web/src/components/plugins/first-party-settings.tsx). A plugin with settings therefore needs a form there too, and the plugin has to accept whatever older forms stored. `normalizeConfig` in the match plugin is an example.

## Changing and publishing a plugin

Work in the registry repository's `plugins/<slug>` directory and increase the
manifest version for every change. Its README describes SDK setup, typechecking,
sandbox tests, packaging, and publication. `bun run build --publish` writes new
immutable archives and descriptors; `bun run check` verifies source checksums and
runs the tests. A merged registry PR publishes updates through GitHub Pages without
rebuilding the panel image.

Reserved first-party slugs and their custom settings forms remain in the panel;
adding a new first-party plugin may therefore also need changes to
`FIRST_PARTY_PLUGIN_NAMES` and the panel's settings UI.
