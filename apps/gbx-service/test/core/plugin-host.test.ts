import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { PluginHost, type ScopedContext } from "../../src/core/plugins/plugin-host";
import { definePlugin, type PluginContext, type PluginDefinition } from "../../src/core/plugins/sdk";
import { silentLogger } from "../fakes/logger";
import { createHarness, pluginRecord } from "../fakes/harness";

function stubContextFactory() {
  const disposed: string[] = [];
  const configs = new Map<string, unknown>();
  const factory = (definition: PluginDefinition<unknown>, record: { config: unknown }): ScopedContext => {
    configs.set(definition.id, record.config);
    return {
      ctx: { pluginId: definition.id, config: () => configs.get(definition.id) } as PluginContext<unknown>,
      setConfig: (config) => configs.set(definition.id, config),
      dispose: async () => {
        disposed.push(definition.id);
      },
    };
  };
  return { factory, disposed, configs };
}

describe("PluginHost", () => {
  it("loads enabled plugins that support the mode", async () => {
    const start = vi.fn();
    const host = new PluginHost(
      [
        definePlugin({ id: "any", create: () => ({ start }) }),
        definePlugin({ id: "ta", gamemodes: ["timeattack"], create: () => ({}) }),
        definePlugin({ id: "off", create: () => ({}) }),
      ],
      stubContextFactory().factory,
      silentLogger,
    );

    await host.sync([pluginRecord("any"), pluginRecord("ta"), pluginRecord("off", null, false)], "rounds");

    expect(host.loadedIds()).toEqual(["any"]);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("swaps plugins when the mode changes", async () => {
    const stub = stubContextFactory();
    const host = new PluginHost(
      [
        definePlugin({ id: "ta", gamemodes: ["timeattack"], create: () => ({}) }),
        definePlugin({ id: "rounds", gamemodes: ["rounds"], create: () => ({}) }),
      ],
      stub.factory,
      silentLogger,
    );
    const records = [pluginRecord("ta"), pluginRecord("rounds")];

    await host.sync(records, "timeattack");
    await host.sync(records, "rounds");

    expect(host.loadedIds()).toEqual(["rounds"]);
    expect(stub.disposed).toEqual(["ta"]);
  });

  it("pushes changed configs to running plugins", async () => {
    const onConfigUpdate = vi.fn();
    const stub = stubContextFactory();
    const host = new PluginHost(
      [definePlugin({ id: "p", create: () => ({ onConfigUpdate }) })],
      stub.factory,
      silentLogger,
    );

    await host.sync([pluginRecord("p", { a: 1 })], "rounds");
    await host.sync([pluginRecord("p", { a: 1 })], "rounds");
    expect(onConfigUpdate).not.toHaveBeenCalled();

    await host.sync([pluginRecord("p", { a: 2 })], "rounds");
    expect(onConfigUpdate).toHaveBeenCalledTimes(1);
    expect(stub.configs.get("p")).toEqual({ a: 2 });
  });

  it("keeps going when a plugin fails to start", async () => {
    const stub = stubContextFactory();
    const host = new PluginHost(
      [
        definePlugin({
          id: "broken",
          create: () => ({
            start() {
              throw new Error("boom");
            },
          }),
        }),
        definePlugin({ id: "fine", create: () => ({}) }),
      ],
      stub.factory,
      silentLogger,
    );

    await host.sync([pluginRecord("broken"), pluginRecord("fine")], "rounds");

    expect(host.loadedIds()).toEqual(["fine"]);
    expect(stub.disposed).toEqual(["broken"]);
  });

  it("reload restarts every running plugin", async () => {
    const create = vi.fn(() => ({}));
    const host = new PluginHost([definePlugin({ id: "p", create })], stubContextFactory().factory, silentLogger);
    await host.sync([pluginRecord("p")], "rounds");
    await host.reload([pluginRecord("p")], "rounds");
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("serves help texts", () => {
    const host = new PluginHost(
      [definePlugin({ id: "p", helpText: "use /p", create: () => ({}) }), definePlugin({ id: "q", create: () => ({}) })],
      stubContextFactory().factory,
      silentLogger,
    );
    expect(host.pluginNames()).toEqual(["p", "q"]);
    expect(host.helpText("p")).toBe("use /p");
    expect(host.helpText("q")).toBe("No help text provided for this plugin.");
    expect(host.helpText("x")).toBe("Plugin not found.");
  });
});

describe("plugin context scoping", () => {
  it("removes every registration when the plugin unloads", async () => {
    const seen: string[] = [];
    const plugin = definePlugin({
      id: "scoped",
      create: (ctx) => {
        ctx.on("playerConnect", (p) => seen.push(`event:${p.login}`));
        ctx.command("hi", (_, login) => seen.push(`command:${login}`));
        ctx.action("click", (a) => seen.push(`action:${a.Login}`));
        ctx.setTimeout(() => seen.push("timer"), 1000);
        const widget = ctx.ui.widget({ id: "scoped-widget", template: "widgets/map-info/map-info" });
        return { start: () => widget.display() };
      },
    });
    const h = await createHarness({ plugins: [plugin], server: { plugins: [pluginRecord("scoped")] } });
    expect(h.runtime.manialinks.displayedIds()).toContain("scoped-widget");

    h.servers.servers.get("server-1")!.plugins = [pluginRecord("scoped", null, false)];
    await h.runtime.refreshPlugins();

    await h.callback("ManiaPlanet.PlayerConnect", ["p1", false]);
    await h.chat("p1", "/hi");
    await h.click("p1", "click");
    await h.clock.advance(2000);

    expect(seen).toEqual([]);
    expect(h.runtime.manialinks.displayedIds()).not.toContain("scoped-widget");
  });

  it("validates config against the plugin schema but keeps running on mismatch", async () => {
    const seen: unknown[] = [];
    const plugin = definePlugin({
      id: "typed",
      configSchema: z.object({ rows: z.number().default(8) }),
      create: (ctx) => {
        seen.push(ctx.config());
        return {};
      },
    });
    const h = await createHarness({ plugins: [plugin], server: { plugins: [pluginRecord("typed", {})] } });
    expect(seen).toEqual([{ rows: 8 }]);

    h.servers.servers.get("server-1")!.plugins = [pluginRecord("typed", { rows: "many" })];
    await h.runtime.refreshPlugins();
    await h.runtime.reloadPlugins();
    expect(seen.at(-1)).toEqual({ rows: "many" });
  });

  it("persists config saved by a plugin", async () => {
    let save: ((config: unknown) => Promise<void>) | null = null;
    const plugin = definePlugin({
      id: "saver",
      create: (ctx) => {
        save = ctx.saveConfig;
        return {};
      },
    });
    const h = await createHarness({ plugins: [plugin], server: { plugins: [pluginRecord("saver", {})] } });
    await save!({ apiKey: "a_b" });
    expect(h.servers.configUpdates).toEqual([
      { serverId: "server-1", pluginId: "plugin-saver", config: { apiKey: "a_b" } },
    ]);
  });
});
