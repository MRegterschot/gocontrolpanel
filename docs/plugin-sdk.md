# Plugin SDK

Everything you see in game next to the panel, such as the map info card, the live ranking, the pick and ban widget and the `/help` command, is a plugin that runs inside the [GBX service](../apps/gbx-service/README.md). This guide explains how plugins work and how to write one.

> **Status.** Plugins are compiled into the GBX service. There is no way yet to load a plugin from outside the repository, so writing a plugin means sending a pull request or running a fork. The SDK is the surface the built-in plugins are written against, and it can still change before third-party plugins are supported (a marketplace is outlined in [backend-split-requirements.md](./backend-split-requirements.md#12-future-plugin-marketplace)). In particular, `ctx.gbx` currently gives full access to the dedicated server.

## How it works

A plugin is a `PluginDefinition` created with `definePlugin()`. For every server, the `PluginHost` keeps the set of running plugins in line with two things:

- the `server_plugins` row of that server: the plugin must be **enabled** (the toggle on the server's Plugins page);
- the current **game mode**: the plugin's `gamemodes` list must be empty or contain the mode (`timeattack`, `rounds`, `reversecup`, `cup`, `tmwc`, `tmwt`, `teams`, `knockout`).

When both match, the host calls `create(ctx)`, then `start()` on the instance it returned. When either stops matching, or the server disconnects, it calls `stop()` and removes everything the plugin registered. A config change calls `onConfigUpdate()`. Mode changes, config changes and reloads are queued, so a plugin never sees two lifecycle calls at once.

A plugin that throws while loading is logged and skipped, and the other plugins keep running. Failing command and action handlers are logged and never reach the player.

Plugins run per server: each server gets its own instance, its own `ctx` and its own config.

## Anatomy of a plugin

```ts
export const myPlugin = definePlugin({
  id: "my-plugin",                    // must equal plugins.name in the database
  gamemodes: ["timeattack"],          // optional, empty or omitted means every mode
  helpText: "/mycommand - does a thing", // shown by /help my-plugin
  configSchema: z.object({ ... }),    // optional, validates server_plugins.config
  create: (ctx) => new MyPlugin(ctx), // register commands, events and actions here
});
```

`create(ctx)` returns a `PluginInstance`, all hooks optional:

| Hook | When |
|---|---|
| `start()` | Once after `create`. Display widgets and load the initial state here. May be async. |
| `stop()` | Before the context is torn down. Only needed for your own cleanup. |
| `onConfigUpdate()` | The stored config of this server changed. `ctx.config()` already returns the new value. |

Register commands, events and actions in the constructor (or `create`) and display widgets in `start()`. You never have to unregister anything: everything registered through `ctx` is removed when the plugin unloads.

## The context

`ctx` is the only thing a plugin should use. Don't import service internals.

| Member | What it does |
|---|---|
| `pluginId`, `serverId`, `serverName()` | Identity of the plugin and of the server it runs on. |
| `log` | A pino logger already tagged with the plugin id. |
| `config()` | The validated config, or `null` when nothing is stored. |
| `saveConfig(config)` | Writes a new config to the database. `ctx.config()` returns the new value right away. |
| `on(event, handler)` | Subscribe to a server event. See [Events](#events). |
| `command(name, handler)` | Handle `/name arg1 arg2`. See [Chat commands](#chat-commands). |
| `action(pattern, handler)` | Handle a manialink button. Returns a function that removes it early. See [Widgets and windows](#widgets-and-windows). |
| `setTimeout(fn, ms)` | Like `setTimeout`, cancelled automatically on unload. Returns a cancel function. |
| `sleep(ms)` | Promise that resolves after `ms`. |
| `ui.widget(options)` | Create a widget shown to everyone (or one player). |
| `ui.window(options)` | Create a closable window for one player. |
| `ui.addAction(button)` / `ui.removeAction(name)` | Add an entry to the shared button bar in the top-left corner of the screen. |
| `chat.send(message)` / `chat.sendTo(login, message)` | Chat message to everyone or to one player. |
| `live` | Read-only view of the live state: `liveInfo` (mode, round, points, scores), `activePlayers`, `activeMapUid`, `roundNumber`, `isReverseCup`, `findActivePlayer(login)`. |
| `players.get(login)` | The active player, or the player fetched from the server. |
| `maps.findByUid(uid)` / `maps.findByFileNames(names)` | Maps from the database. |
| `mapList` | The server's map list. |
| `records.local(mapUid)` / `records.forPlayers(mapUid, logins)` | Records stored by this panel. |
| `nadeo` | World record and account name lookups. |
| `ecm` | eCircuitMania client. |
| `notifyAdmins(message, description?)` | Notification to every admin of this server, shown in the panel. |
| `server.setScriptName(script)` / `server.setPaused(paused)` | Change the mode script without the chat announcement, pause or unpause the match. |
| `gbx` | Raw dedicated server access: `call(method, ...params)`, `callScript(method, ...params)`, `multicall(calls)` and `send(method, ...params)` (fire and forget). |

### Events

`ctx.on(event, handler)` is typed from `ServerEventMap` in [`server-events.ts`](../apps/gbx-service/src/core/server/server-events.ts), where every event and its arguments are listed. The ones plugins use most:

| Event | Arguments | Fires when |
|---|---|---|
| `playerConnect`, `playerDisconnect` | `player` / `login` | A player joins or leaves. |
| `playerChat` | `chat` | A player writes in chat. |
| `beginMap`, `endMap` | `mapUid` | A map starts or ends. |
| `beginRound`, `endRound` | `round` / `scores` | A round starts or ends. |
| `checkpoint`, `finish`, `giveUp` | `waypoint` / `event` | A player passes a checkpoint, finishes or gives up. |
| `live-checkpoint`, `live-finish`, `live-giveUp` | `round` | The same, after the live state has been updated. Use these to render the live state. |
| `scores`, `playerUpdated`, `teamUpdated` | `scores` / `round` / `team` | Points changed. |
| `warmUpStart`, `warmUpEnd` | `liveInfo` | Warm up changes. |
| `modeChange` | `type` | The game mode changed. |

Handlers can be async. A handler that throws doesn't stop other handlers.

### Chat commands

```ts
ctx.command("hello", (args, login) => ctx.chat.sendTo(login, `Hi ${login}`));
```

The name is matched case-insensitively and without the slash, `args` are the words after it. Several plugins can handle the same command and all of them run. `/help` lists the available plugins and `/help <plugin>` prints the plugin's `helpText`. Admins can turn the help command off on the server's settings page.

### Config

Plugin config is stored as JSON in `server_plugins.config` and edited on the panel's Plugins page. Declare a zod `configSchema` and the host validates and parses (defaults included) the stored value before `ctx.config()` returns it. A config that doesn't match is logged and used as it is, so an older stored value never turns a plugin off. Treat every field as possibly missing.

The plugin config page of the panel has one form per plugin (`apps/web/src/forms/server/plugins` and `apps/web/src/components/modals/plugins/plugins`). A plugin with config therefore needs a form in the web app too, and its stored shape should stay in sync with the schema in the service. The shared config schemas of the built-in plugins live in [`packages/shared/src/types/plugins.ts`](../packages/shared/src/types/plugins.ts).

### Widgets and windows

A widget is a Manialink page (the XML UI format of the game) that the service renders from a Handlebars template and sends to the players.

```ts
const widget = ctx.ui.widget({
  id: "my-widget",                      // unique per server
  template: "widgets/my-plugin/my-widget", // path below templates/, without .hbs
  position: { x: 100, y: 85 },
  hideWhileDriving: true,
  data: { ... },                        // available as `data` in the template
});

widget.display();                       // show to everyone
widget.setData({ ... });                // change the data
widget.update();                        // push only the data, see below
widget.hide();
```

- **Main page and update page.** By default a widget is a pair: `my-widget` holds the layout and the ManiaScript loop, and `my-widget-update` (template `<template>-update`) only carries data. `update()` sends the data page, so the main page keeps its client-side state and animations. Pass `withUpdate: false` for a static widget. The update page writes the data to a variable the main page's loop reads; copy the pattern of [`map-info`](../apps/gbx-service/templates/widgets/map-info).
- **Per player.** Pass `login` to show a widget to one player only.
- **Windows.** `ctx.ui.window({ id, template, login, title, onClose })` creates a window for a single player with a close button already wired up. Templates live in `templates/windows/`.
- **Buttons.** A manialink element with `action="some-name"` calls the handler registered with `ctx.action("some-name", (answer, params) => ...)`. `answer.Login` is the player who clicked. A pattern with placeholders, like `"match-pick-{uid}"`, passes the matched part as `params.uid`. Action names are global to the server, so prefix them with your plugin id.
- **Button bar.** `ctx.ui.addAction({ name, icon, action })` adds an entry to the shared button bar in the top-left corner. The bar is removed again when the last entry goes.
- **Templates.** Every `.hbs` file in `apps/gbx-service/templates/` is loaded at startup and named by its path, for example `widgets/map-info/map-info`. Extend the `widget` layout and fill the blocks `widget`, `globals`, `script`, `main`, `events` and `loop`, or extend `manialink` for a raw page. Available helpers: `default`, `eq`, `bool`, `boolToNum`, `length`, `jsonLength`, `range`, `add`, `subtract`, `multiply`, `divide`. Pass larger values as JSON strings and parse them with `fromjson` in ManiaScript, as the built-in widgets do.

## Registering a plugin

1. **Write the plugin** in `apps/gbx-service/src/core/plugins/builtin/<name>.ts` and add it to the list in `builtin/index.ts`. The order is the order widgets are layered in.
2. **Add the templates** to `apps/gbx-service/templates/`.
3. **Add a database row** so the plugin shows up and can be enabled. Create one migration per database flavour (`bun run migrate:create` with `DB=mysql`, then again with `DB=postgres`) and insert the plugin. `name` must equal the plugin `id`:

   ```sql
   -- MySQL / MariaDB
   INSERT INTO plugins (id, name, description, updatedAt)
   VALUES (UUID(), 'hello', 'Greets players and shows a greeting widget.', NOW());
   ```

   ```sql
   -- PostgreSQL
   CREATE EXTENSION IF NOT EXISTS pgcrypto;

   INSERT INTO plugins (id, name, description, "updatedAt")
   VALUES (gen_random_uuid(), 'hello', 'Greets players and shows a greeting widget.', NOW());
   ```

4. **Add a toggle to the panel.** Add `"hello": z.boolean().optional()` to `PluginsSchema` in `apps/web/src/forms/server/plugins/plugins-schema.ts`, and a switch for it in `plugins-form.tsx` next to the others. If the plugin has config, add a form and modal there as well.

The service reads the `plugins` and `server_plugins` tables, so after the migration an admin can enable the plugin on a server's Plugins page. **Reload plugins** on that page, or the config save, applies it without a restart.

## Example: a greeting plugin

A plugin with config, a chat command, two events and a widget. The config is validated with zod, `onConfigUpdate()` refreshes the widget when an admin changes the greeting, and nothing needs cleaning up when the plugin unloads.

`apps/gbx-service/src/core/plugins/builtin/hello.ts`

```ts
import { z } from "zod";
import { definePlugin, type PluginContext, type PluginInstance } from "../sdk";

const configSchema = z.object({ greeting: z.string().default("Hi") });
type HelloConfig = z.infer<typeof configSchema>;

class HelloPlugin implements PluginInstance {
  private readonly widget;

  constructor(private readonly ctx: PluginContext<HelloConfig>) {
    this.widget = ctx.ui.widget({
      id: "hello-widget",
      template: "widgets/hello/hello",
      position: { x: -158, y: 60 },
      hideWhileDriving: true,
    });

    ctx.command("hello", (_args, login) => this.greet(login));
    ctx.on("playerConnect", (player) => this.greet(player.login));
    ctx.on("beginMap", () => this.refresh());
  }

  start() {
    this.widget.display();
    this.refresh();
  }

  onConfigUpdate() {
    this.refresh();
  }

  private greeting() {
    return this.ctx.config()?.greeting ?? "Hi";
  }

  private async greet(login: string) {
    const player = await this.ctx.players.get(login);
    await this.ctx.chat.sendTo(login, `${this.greeting()} ${player.nickName}!`);
  }

  private refresh() {
    this.widget.setData({ greetingJson: JSON.stringify({ text: this.greeting() }) });
    this.widget.update();
  }
}

export const helloPlugin = definePlugin({
  id: "hello",
  gamemodes: ["timeattack", "rounds"],
  helpText: "/hello - the server says hi",
  configSchema,
  create: (ctx) => new HelloPlugin(ctx),
});
```

`apps/gbx-service/templates/widgets/hello/hello.hbs`

```handlebars
{{#extend "widget"}}
{{#content "widget"}}
<quad pos="0 0" size="40 8" bgcolor="222" opacity="0.8"/>
<label id="greeting" pos="20 -4" z-index="1" size="38 6" text="" halign="center" valign="center" textsize="2" textcolor="FFF"/>
{{/content}}

{{#content "globals"}}
#Struct Greeting {
  Text text;
}
{{/content}}

{{#content "main"}}
declare Greeting HelloGreeting for This;
declare Integer LastHelloUpdate for This = -1;
declare Integer lastUpdate = -1;
{{/content}}

{{#content "loop"}}
if (LastHelloUpdate != lastUpdate) {
  lastUpdate = LastHelloUpdate;
  (Page.MainFrame.GetFirstChild("greeting") as CMlLabel).SetText(HelloGreeting.text);
}
{{/content}}
{{/extend}}
```

`apps/gbx-service/templates/widgets/hello/hello-update.hbs`

```handlebars
{{#extend "manialink"}}
{{#content "content"}}
<script>
<!--
#Struct Greeting {
  Text text;
}

main(){
  declare Greeting HelloGreeting for This;
  declare Integer LastHelloUpdate for This;
  declare Text greetingJson = """{{{ default data.greetingJson '{}' }}}""";

  HelloGreeting.fromjson(greetingJson);
  LastHelloUpdate = GameTime;
}
-->
</script>
{{/content}}
{{/extend}}
```

## Testing

`apps/gbx-service/test/fakes/harness.ts` builds a real server runtime on top of a scriptable fake dedicated server and in-memory repositories. A plugin test is "emit a callback, assert what was sent":

```ts
import { expect, it } from "vitest";
import { helloPlugin } from "../../src/core/plugins/builtin/hello";
import { createHarness, player, pluginRecord } from "../fakes/harness";

it("greets", async () => {
  const h = await createHarness({
    plugins: [helloPlugin],
    scriptName: "Trackmania/TM_TimeAttack_Online.Script.txt",
    players: [player("p1")],
    server: { plugins: [pluginRecord("hello", { greeting: "Yo" })] },
  });
  expect(h.session.widgetJson("hello-widget-update", "greetingJson")).toEqual({ text: "Yo" });
  await h.chat("p1", "/hello");
  expect(h.session.callsTo("ChatSendServerMessageToLogin").at(-1)?.params).toEqual(["Yo Nick p1!", "p1"]);
});
```

Useful harness pieces: `h.chat(login, text)` writes in chat, `h.click(login, action)` presses a manialink button, `h.script(method, payload)` emits a mode script callback, `h.session.callsTo(method)` lists the calls made to the dedicated server and `h.session.widgetJson(id, key)` reads the data a widget was sent. The built-in plugin tests in `apps/gbx-service/test/plugins/` show the same pattern for every kind of plugin.

```bash
bun run --filter @gcp/gbx-service test
bun run --filter @gcp/gbx-service typecheck
```

To see a plugin in a real game client, use the isolated stack in [real-server-testing.md](./real-server-testing.md) (after `bun run e2e:migrate` the seed script can enable your plugin, see `E2E_PLUGINS`).
