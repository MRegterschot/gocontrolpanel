# Plugin SDK

Plugins add widgets, windows, chat commands and automation to Trackmania servers managed by GoControlPanel. A plugin is a small package: a manifest, one JavaScript bundle and its manialink templates. Admins install it per server from the [marketplace](./plugin-marketplace.md), or upload it privately to their own panel. It runs in a sandbox and can only do what the admin allowed when they installed it.

This guide is for plugin authors. For how panels run and review plugins, see [plugin-marketplace.md](./plugin-marketplace.md). The first-party plugins published in the registry are written with this SDK too; see [first-party-plugins.md](./first-party-plugins.md).

## Quick start

```bash
tmcp-plugin init my-plugin   # tmcp-plugin.json, src/index.ts, a widget template and a README
cd my-plugin
tmcp-plugin pack             # builds and checks dist/my-plugin-0.1.0.zip
```

Upload the zip on **Plugins → Uploaded**, then install it on one of your servers. It's private to you until you [publish it](#publishing-to-the-marketplace).

> **The SDK is not on npm yet.** Until it is, run the CLI from a clone of this repository, for example `bun packages/plugin-sdk/src/cli/main.ts init ~/my-plugin`. The other commands work the same way. For editor types, install it from the clone: `npm install --save-dev ../gocontrolpanel/packages/plugin-sdk`. The build doesn't need it installed.

| Command | What it does |
|---|---|
| `tmcp-plugin init <dir>` | Creates a plugin project. `--slug` and `--name` override the defaults taken from the folder name. |
| `tmcp-plugin build [dir]` | Bundles `src/index.ts` (or `.js`) into `dist/<entry>`. `--minify` is available, but reviewers prefer readable bundles. |
| `tmcp-plugin pack [dir]` | Builds, zips and validates the package exactly as a panel will. It prints the sha256 and the registry entry you need to publish. |
| `tmcp-plugin validate <file.zip>` | Checks an existing package and prints its manifest and capabilities. |
| `tmcp-plugin registry` | Builds the marketplace site from a registry repository (used by the registry's CI). |

## Project layout

```
my-plugin/
├─ tmcp-plugin.json        manifest
├─ src/index.ts           the plugin; bundled into one script
├─ templates/             manialink templates, e.g. templates/widgets/main.hbs
├─ README.md              shown on the plugin's marketplace page
├─ CHANGELOG.md           optional
├─ LICENSE                optional
└─ icon.png               optional, at most 256 KB
```

A package may be at most 5 MB, unpack to at most 10 MB and hold at most 500 files. The bundle may be 2 MB, each template 256 KB, and docs 200 KB each. The names `manialink`, `widget`, `window` and `scripts/hide` are reserved for the layouts every plugin can extend.

## The manifest

`tmcp-plugin.json`:

```json
{
  "slug": "hello",
  "name": "Hello",
  "version": "1.0.0",
  "sdk": 1,
  "description": "Greets players when they join.",
  "author": "Your name",
  "license": "MIT",
  "repository": "https://github.com/you/hello",
  "commands": ["hello"],
  "capabilities": ["ui", "chat:send", "storage"],
  "configSchema": {
    "type": "object",
    "properties": {
      "greeting": { "type": "string", "title": "Greeting", "default": "Welcome", "maxLength": 100 }
    }
  },
  "helpText": "/hello - the server says hi"
}
```

| Field | Rules |
|---|---|
| `slug` | 3-40 characters: lowercase letters, digits and dashes, starting with a letter. It identifies the plugin and prefixes its widget ids and actions. The names of the [first-party plugins](./first-party-plugins.md) and a few others (`help`, `plugins`, `server`, ...) are reserved. |
| `name`, `description`, `author` | At most 60, 300 and 100 characters. |
| `version` | A [semantic version](https://semver.org): `1.2.3`, or `1.2.3-beta.1` for a pre-release. |
| `sdk` | The plugin SDK version the plugin targets. Currently `2` (SDK 1 packages remain supported). Panels refuse plugins for a newer SDK than they run. |
| `license`, `repository`, `homepage` | Optional. The links must be `https://`. |
| `entry` | Path of the bundle inside the package. Default `index.js`. |
| `gamemodes` | Modes the plugin runs in: `timeattack`, `rounds`, `reversecup`, `cup`, `tmwc`, `tmwt`, `teams`, `knockout`. Leave it out to run in every mode. |
| `commands` | Chat commands the plugin may register, without the slash. At most 20. `help`, `version`, `uptime`, `status`, `plugins`, `ping`, `sysinfo`, and `diagnostics` belong to the panel. |
| `capabilities` | What the plugin may do. See [Capabilities](#capabilities). |
| `configSchema` | The plugin's settings form. See [Settings](#settings). |
| `helpText` | Shown by `/help <slug>`. At most 1000 characters. |

## Writing the plugin

```ts
import { definePlugin, type Widget } from "@tmcontrolpanel/plugin-sdk";

interface Config {
  greeting: string;
}

export default definePlugin<Config>({
  create(ctx) {
    ctx.command("hello", (_args, login) => ctx.chat.sendTo(login, ctx.config().greeting));
    ctx.on("playerConnect", (player) => ctx.chat.sendTo(player.login, ctx.config().greeting));

    return {
      start() {
        // Show widgets and load state here
      },
      onConfigUpdate() {
        // The admin saved new settings; ctx.config() already returns them
      },
      stop() {
        // Only for your own cleanup
      },
    };
  },
});
```

`create(ctx)` runs when the plugin loads on a server. Register commands, events and actions there, and return the hooks you need. A plugin is loaded when it is installed and turned on for the server and the current game mode matches `gamemodes`. It is unloaded when either stops being true, the server disconnects or another version is installed. Everything registered through `ctx` is removed on unload: event handlers, commands, actions, timers, widgets and buttons. Every server runs its own copy with its own settings and storage.

Callbacks may be `async`. A callback that throws or rejects is logged with the plugin's id and never reaches the player.

## The context

| Member | Capability | What it does |
|---|---|---|
| `pluginId`, `serverId`, `serverName()` | | Identity of the plugin and of the server. |
| `log.debug/info/warn/error(message, data?)` | | Writes to the GBX service log, tagged with the plugin id. |
| `config()` / `saveConfig(config)` | | The settings with defaults filled in. `saveConfig` is validated against `configSchema`. |
| `on(event, handler)` | | Server events. See [Events](#events). |
| `command(name, handler)` | | A chat command from the manifest. The handler gets `(args, login)`. |
| `action(name, handler)` | | A manialink button. See [Widgets](#widgets-and-windows). |
| `setTimeout(fn, ms)`, `setInterval(fn, ms)`, `sleep(ms)` | | Timers that are cleared on unload. Both return a cancel function. Intervals run at most every 100 ms. |
| `live.liveInfo`, `live.activePlayers`, `live.activeMapUid`, `live.roundNumber`, `live.findActivePlayer(login)` | | Read-only live state of the server. |
| `players.get(login)` | | A player, from the live state or the server. |
| `ui.widget(options)`, `ui.window(options)`, `ui.addButton(button)`, `ui.removeButton(name)` | `ui` | Widgets, windows and the shared button bar. |
| `chat.send(message)`, `chat.sendTo(login, message)` | `chat:send` | Chat messages. |
| `storage.get/set/delete/keys` | `storage` | JSON values kept per server. |
| `records.local(mapUid)`, `records.forPlayers(mapUid, logins)` | `records:read` | Records stored by the panel. |
| `maps.findByUid(uid)`, `maps.findByFileNames(names)` | `maps:read` | Maps stored by the panel. |
| `nadeo.worldRecord`, `nadeo.personalBests`, `nadeo.accountNames` | `nadeo:read` | Nadeo leaderboards and names, through the panel's Nadeo account. |
| `notifyAdmins(message, description?)` | `notifications` | A notification for the server's admins in the panel. |
| `server.setPaused(paused)`, `server.setScriptName(script)` | `mode:control` | Pause the match, change the mode script. |
| `gbx.call(method, ...params)`, `gbx.callScript(method, ...params)` | per method | Dedicated server calls. See [Server calls](#server-calls). |
| `http.fetch(url, request?)` | `http:<host>` | HTTPS requests. See [Web requests](#web-requests). |

Calling something behind a capability the plugin didn't declare, or that the admin didn't grant, throws a `CapabilityError`. Going over a rate limit throws a `RateLimitError`.

## Capabilities

Admins see these when they install the plugin, and an update that adds one needs their consent again.

| Capability | Risk | Unlocks |
|---|---|---|
| `ui` | medium | Widgets, windows and buttons. Their ManiaScript runs in the players' game and can open links. |
| `chat:send` | low | `ctx.chat`. |
| `storage` | low | `ctx.storage`. |
| `records:read` | low | `ctx.records`. |
| `maps:read` | low | `ctx.maps`, and the `GetMapList` and `GetMapInfo` calls. |
| `maps:write` | medium | Changing the map list and skipping, restarting or jumping to maps. |
| `players:moderate` | high | Kicking, banning, forcing spectator, and editing the black list, guest list and ignore list. |
| `mode:control` | high | `ctx.server`, mode script settings, and mode script events that change the match. |
| `notifications` | low | `ctx.notifyAdmins`. |
| `nadeo:read` | low | `ctx.nadeo`. |
| `http:<host>` | medium | HTTPS requests to that host. `http:*.example.com` covers every subdomain. At most 10 hosts; IP addresses are not allowed. |

Ask only for what the plugin needs. Reviewers turn down plugins that ask for more, and admins are less likely to install them.

## Events

`ctx.on(name, handler)` takes the events of `PluginEvents` in the SDK's types, with typed payloads:

- **Players:** `playerConnect`, `playerConnectInfo`, `playerDisconnect`, `playerDisconnectInfo`, `playerInfo`, `playerInfoChanged`, `playerList`, `playerChat`.
- **Maps and rounds:** `beginMap`, `endMap`, `startMap`, `beginMatch`, `startRound`, `beginRound`, `endRound`, `live-endRound`, `scores`.
- **Driving:** `checkpoint`, `live-checkpoint`, `finish`, `live-finish`, `personalBest`, `giveUp`, `live-giveUp`, `startLine`, `skipOutro`.
- **Mode:** `warmUpStart`, `warmUpEnd`, `warmUpStartRound`, `updatedSettings`, `elimination`, `modeChange`, `playerUpdated`, `teamUpdated`.
- **Connection:** `connect`, `disconnect`.

The `live-*` events fire after the live state was updated, so use those to render it. Answers to other plugins' manialinks are not available. Use `ctx.action` for your own.

## Widgets and windows

A widget is a manialink page rendered from one of the package's templates. Templates are Handlebars, rendered inside the sandbox, and can extend these layouts:

- `widget`: a positioned frame with a script loop. Fill the blocks `widget` (the elements), `globals`, `script`, `main`, `events` and `loop`. Set `hideWhileDriving` to slide it away while the player drives.
- `window`: a centred window with a title bar and a close button. Fill `window`, `globals`, `script`, `main`, `events` and `loop`.
- `manialink`: a bare page; fill `content`.

```hbs
{{#extend "widget"}}
{{#content "widget"}}
<frame pos="0 0">
  <quad pos="0 0" size="50 8" bgcolor="222" opacity="0.85" />
  <label pos="2 -4" size="38 6" text="{{ data.text }}" valign="center" textsize="1.5" textcolor="FFF" />
  <label pos="45 -4" size="8 6" text="Hi" halign="center" valign="center" action="{{action "wave"}}" />
</frame>
{{/content}}
{{/extend}}
```

```ts
const widget = ctx.ui.widget({
  id: "greeting",               // letters, digits, - and _
  template: "widgets/greeting", // templates/widgets/greeting.hbs
  withUpdate: false,            // see below
  position: { x: -158, y: 60 },
  hideWhileDriving: true,
  login: undefined,             // set it to show the widget to one player only
});
widget.setData({ text: "Hello" });
widget.display();

ctx.action("wave", (answer) => ctx.chat.sendTo(answer.login, "Hi!"));
```

- **Ids and actions are prefixed** with the plugin's slug: the page id is `plg.<slug>.<id>` and actions are `<slug>:<name>`. Use `{{action "name"}}` in templates (`{{action "pick-" uid}}` joins its arguments) and `ctx.action("name", ...)` in code. In ManiaScript, `{{actionPrefix}}` gives the prefix. A pattern like `ctx.action("pick-{uid}", ...)` passes the matched part as `params.uid`. Anyone can send any action from their game client, so check `answer.login` before doing something privileged.
- **Update pages.** By default a widget is a pair of pages: `<template>` holds the layout and script, and `<template>-update` carries only data. `widget.update()` sends the data page, so the main page keeps its client-side state. With `withUpdate: false` there's a single page, and `display()` re-renders it.
- **Windows** belong to one player: `ctx.ui.window({ id, template, login, title, onClose })`. The close button and `window.close()` remove the window and call `onClose`.
- **The button bar** in the top-left corner: `ctx.ui.addButton({ name, icon, action })`, where `icon` is a text glyph or, with `type: "image"`, an image URL.
- **Rules for pages.** A rendered page must be one `<manialink>` element with the page's own id, at most 128 KB. Pages that break this are refused with an error. Template helpers: `default`, `eq`, `bool`, `boolToNum`, `length`, `jsonLength`, `range`, `add`, `subtract`, `multiply`, `divide`, `action`, `actionPrefix`.

## Settings

`configSchema` describes the settings form admins fill in on the server's Plugins page. It is a small subset of JSON Schema: an object whose `properties` are at most 50 fields.

| Field type | Keywords |
|---|---|
| `string` | `title`, `description`, `default`, `enum` (a dropdown), `minLength`, `maxLength`, `multiline` (a text area), `secret` |
| `number`, `integer` | `title`, `description`, `default`, `minimum`, `maximum` |
| `boolean` | `title`, `description`, `default` |
| `array` | `title`, `description`, `default`, `minItems`, `maxItems`, `items` (any supported field), `addLabel`, `defaultFrom`, `csv` |
| `object` | `title`, `description`, `properties`, `required` |

SDK 2 adds nested objects and lists (at most five nested fields and 500 list items),
with the same validation in the panel and runtime. Fields can declare
`visibleWhen: { "property": "type", "equals": "team" }` relative to their containing
object. This controls visibility; hidden saved values are still validated and retained.

String `widget` values provide `user` (search and explicit login selection), `map`
(server map selector), `script` (server script selector), or `order` (pick/ban/random
steps stored as `p:1,b:2,r`). An order can set `maxItemsFrom: "maps"` to limit steps
against a root list. `format: "underscore-pair"` validates exactly one underscore.
These are fixed panel controls, not executable code from plugins.

Arrays with `addLabel` render repeatable rows with a full-width Add button.
A user-login list can set `defaultFrom: "current-user"` to initially include the
current admin when no stored value/default exists. Object lists can declare a CSV
mapping, for example:

```json
"csv": {
  "columns": { "name": "Team" },
  "lists": { "players": ["Player Login 1", "Player Login 2"] },
  "seed": "seed"
}
```

`columns` maps config properties to CSV column headers, `lists` collects nonempty
columns into a list property, and `seed` fills that property with the row number
starting at 1. Imported JSON and CSV are validated before replacing the form values.

`required` lists the fields that must have a value. `pattern` is not supported, because the regex would run on the panel.

`secret` fields are top-level strings (API keys) are write-only: the panel never shows a saved value, a field left empty keeps it, and config exports leave it out.

`ctx.config()` returns the settings with the defaults filled in. When an update changes the schema, stored values that no longer fit fall back to their default, field by field. Without a `configSchema` the plugin has no settings form, and `ctx.config()` returns `{}` unless the plugin saved something itself.

## Storage

`ctx.storage` keeps JSON values per server. Each server holds at most 1000 keys and 1 MB for a plugin, with up to 64 KB per value. Keys are 1-128 printable characters without spaces, and `keys(prefix)` lists them. The data is deleted when the plugin is uninstalled from the server.

## Server calls

`ctx.gbx.call(method, ...params)` reaches the dedicated server directly, limited per capability:

- **Always:** `GetCurrentMapInfo`, `GetNextMapInfo`, `GetCurrentMapIndex`, `GetNextMapIndex`, `GetPlayerList`, `GetPlayerInfo`, `GetModeScriptInfo`, `GetModeScriptSettings`, `GetScriptName`, `GetServerName`, `GetServerComment`, `GetVersion`, `GetMaxPlayers`, `GetMaxSpectators`.
- **`maps:read`:** `GetMapList`, `GetMapInfo`.
- **`maps:write`:** `NextMap`, `RestartMap`, `JumpToMapIndex`, `JumpToMapIdent`, `SetNextMapIndex`, `SetNextMapIdent`, `AddMap`, `AddMapList`, `InsertMap`, `InsertMapList`, `RemoveMap`, `RemoveMapList`, `ChooseNextMap`, `ChooseNextMapList`.
- **`players:moderate`:** `Kick`, `Ban`, `UnBan`, `BanAndBlackList`, `BlackList`, `UnBlackList`, `ForceSpectator`, `ForceSpectatorTarget`, `SpectatorReleasePlayerSlot`, `ForcePlayerTeam`, `AddGuest`, `RemoveGuest`, `Ignore`, `UnIgnore`, `GetBanList`, `GetBlackList`, `GetGuestList`, `GetIgnoreList`.
- **`mode:control`:** `SetModeScriptSettings`, `SetScriptName`.

`ctx.gbx.callScript(method, ...params)` triggers mode script events (`TriggerModeScriptEventArray`). The state reads (`Trackmania.GetScores`, `Trackmania.WarmUp.GetStatus`, `Maniaplanet.WarmUp.GetStatus`, `Maniaplanet.Pause.GetStatus`, `Trackmania.GetPointsRepartition`, `Maniaplanet.Mode.GetUseTeams`) are always allowed; everything else needs `mode:control`.

Manialink and chat methods are never available here: use `ctx.ui` and `ctx.chat`. Methods that return passwords or IP addresses aren't available at all.

## Web requests

`ctx.http.fetch(url, { method, headers, body, timeoutMs })` needs an `http:<host>` capability for the URL's host, and:

- only `https://` on the default port, without credentials in the URL;
- never to a private, loopback or link-local address, wherever the name points;
- no redirects are followed;
- bodies up to 256 KB, answers up to 1 MB, 10 seconds by default and 30 at most;
- `Host`, `Connection` and other hop-by-hop headers can't be set.

The answer is `{ status, headers, body, json() }`.

## Limits

Every plugin runs in its own QuickJS interpreter inside a WebAssembly instance, without Node.js, network or file access, and without the service's environment variables.

| Limit | Value | When it's crossed |
|---|---|---|
| Memory | 32 MB | turned off |
| Loading (evaluating the bundle and `create`) | 2 s | turned off |
| One callback, timer or promise continuation | 100 ms | turned off |
| CPU per minute, all callbacks together | 6 s | turned off |
| `start()` and `stop()` finishing their async work | 10 s | load fails / logged |
| Uncaught errors | 100 per minute | turned off |
| Rate limit rejections | 300 per minute | turned off |
| Server calls | 20 per second, bursts of 50 | `RateLimitError` |
| Chat messages | 2 per second, bursts of 10 | `RateLimitError` |
| Widget updates | 40 per second, bursts of 100 | `RateLimitError` |
| Storage writes | 10 per second, bursts of 50 | `RateLimitError` |
| Web and Nadeo requests | 1 per second, bursts of 10 | `RateLimitError` |
| Admin notifications | 1 per minute, bursts of 3 | `RateLimitError` |
| Timers / handlers / widgets / calls in flight | 100 / 1000 / 200 / 100 | `LimitError` |

A plugin that is turned off stays off on that server until an admin turns it back on. The admins get a notification saying why.

## Testing your plugin

- Unit-test the plugin's own logic with any test runner. `definePlugin` only registers the plugin when it runs inside a panel.
- Try it on a test server. Upload the zip on **Plugins → Uploaded**, install it on a server you're an admin of, and watch the GBX service log: everything the plugin logs carries its `pluginId`.
- To work on GoControlPanel itself, `apps/gbx-service/test/plugins/sandbox.test.ts` runs packaged plugins against a fake dedicated server, and the [real-server test plan](./real-server-testing.md) covers a real one.

## Publishing to the marketplace

The marketplace is a GitHub repository. Its pull requests are the review:

1. Run `tmcp-plugin pack`, and attach the zip to a release of your plugin's repository.
2. Open a pull request on the registry that adds `plugins/<slug>/versions/<version>.json` with the `url`, `sha256` and `publishedAt` printed by `pack`, plus an optional `changelog`.
3. The registry's CI downloads the package, checks its sha256 and validates it the same way a panel does. A maintainer reviews the code and the capabilities.

Once merged, the version shows up in every panel within minutes. See the registry's README for the review checklist.

**Updates** are new versions with a higher version number. Admins choose when to update, and an update that asks for more capabilities needs their consent again. A version can't be changed after it is published; publish a new one instead.

## Example

[`packages/plugin-sdk/examples/hello`](../packages/plugin-sdk/examples/hello) is a complete plugin. It greets players when they join, counts the greetings per player in storage, and shows a widget with a button. It uses settings, a command, an event, an action, a widget and storage.
