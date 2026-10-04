# First-party plugins

The plugins that ship with GoControlPanel are ordinary [plugin SDK](./plugin-sdk.md) packages. They run in the same sandbox as marketplace plugins, with only the capabilities they declare. This guide is for contributors who change them or add one.

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

Each plugin is a folder in [`plugins/`](../plugins), laid out like any SDK project: `tmcp-plugin.json`, `src/index.ts`, `templates/` and a `README.md`. The `plugins/` workspace builds them all:

```bash
bun run --filter @gcp/first-party-plugins build      # packs every plugin into apps/gbx-service/first-party
bun run --filter @gcp/first-party-plugins typecheck
```

The GBX service's `dev` and `build` scripts run that build, and the Docker image ships the zips in `first-party/` (`FIRST_PARTY_PLUGINS_DIR` overrides the folder).

Their slugs are reserved for them: `tmcp-plugin init` and private uploads refuse those names. The marketplace registry accepts them, so the same packages can be published there.

## How a panel gets them

On every start, before any server connects, the service installs the packages it ships with:

1. Each package is stored as a plugin version, like a marketplace download. Versions it already has are left alone.
2. Servers that ran the old built-in plugin (from before plugins were packages) are moved onto the package. They keep their on/off state and settings, and get the package's capabilities granted. Old rows that were never turned on or configured are removed.
3. An uploaded plugin that already took the name is skipped, with a warning in the log.

After that the first-party plugins behave like marketplace plugins. Admins install, turn on and off, and uninstall them per server on the server's Plugins page, under **Install**. When a newer service ships a newer version, the Plugins page offers it as an update. If the new version asks for more capabilities, the admin has to accept them again. Uninstalling a first-party plugin keeps the package, so it stays available on the panel.

## Settings

First-party plugins don't declare a `configSchema`. The panel keeps its own forms for them (`apps/web/src/forms/server/plugins` and `apps/web/src/components/modals/plugins/plugins`). The Plugins page opens them from **Configure** through [`first-party-settings.tsx`](../apps/web/src/components/plugins/first-party-settings.tsx). A plugin with settings therefore needs a form there too, and the plugin has to accept whatever older forms stored. `normalizeConfig` in the match plugin is an example.

## Changing a plugin

1. Edit the plugin in `plugins/<slug>` and **raise `version`** in its `tmcp-plugin.json`. Panels that already store a version keep their copy of it, so a change under the same version number never reaches them.
2. If it needs more access, add the capability. Admins will be asked to accept it when they update.
3. Run the tests. `apps/gbx-service/test/plugins/widget-plugins.test.ts` and `match-plugin.test.ts` load the packages into the real sandbox through the test harness:

   ```ts
   const h = await createHarness({
     players: [player("p1")],
     packages: [{ bytes: await firstPartyPackage("map-info"), config: {} }],
   });
   expect(h.session.widgetJson("plg.map-info.map-info-widget-update", "mapJson")).toEqual({ name: "Map A", author: "Author" });
   ```

   Page ids are prefixed with `plg.<slug>.` and actions with `<slug>:`, as for every sandboxed plugin.

To add a plugin, create the folder (copying an existing one is quickest), add its slug to `FIRST_PARTY_PLUGIN_NAMES` in [`packages/shared/src/plugins/manifest.ts`](../packages/shared/src/plugins/manifest.ts), and add a form to the panel if it has settings.

## Publishing to the marketplace

The [registry](https://github.com/MRegterschot/tmcontrolpanel-plugins) lists the first-party plugins too, so panels that read the marketplace see updates there. Publish the zips from the same build that the image ships. Packing is deterministic, but a panel refuses a marketplace copy whose checksum differs from the version it already stores. See [plugin-sdk.md](./plugin-sdk.md#publishing-to-the-marketplace) for the registry steps.
