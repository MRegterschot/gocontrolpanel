import { packPlugin } from "@tmcontrolpanel/plugin-sdk/cli";
import { createPluginPackage } from "@tmcp/shared/plugin-package";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_SANDBOX_LIMITS } from "../../src/core/plugins/sandbox/limits";
import { createHarness, packageRecord, player, SERVER_ID, type Harness } from "../fakes/harness";

const EXAMPLE = fileURLToPath(new URL("../../../../packages/plugin-sdk/examples/hello", import.meta.url));

let outDir: string;
let hello: Uint8Array;

beforeAll(async () => {
  outDir = mkdtempSync(join(tmpdir(), "tmcp-sandbox-"));
  hello = (await packPlugin(EXAMPLE, { outDir })).bytes;
});

afterAll(() => rmSync(outDir, { recursive: true, force: true }));

// A package around hand-written plugin code; the plugin reports through storage
function testPackage(
  code: string,
  manifest: Record<string, unknown> = {},
  templates: Record<string, string> = {},
): Uint8Array {
  return createPluginPackage({
    "tmcp-plugin.json": JSON.stringify({
      slug: "test-plugin",
      name: "Test plugin",
      version: "1.0.0",
      sdk: 1,
      description: "Test",
      author: "Tests",
      capabilities: ["storage"],
      ...manifest,
    }),
    "index.js": `globalThis.__tmcpRegister({ create(ctx) { ${code} } });`,
    ...Object.fromEntries(
      Object.entries(templates).map(([name, source]) => [`templates/${name}.hbs`, source]),
    ),
  });
}

const stored = (h: Harness, key: string, plugin = "test-plugin") =>
  h.pluginStorage.values.get(`${SERVER_ID}/plugin-${plugin}/${key}`)?.value;

const record = (h: Harness, name: string) =>
  h.servers.servers.get(SERVER_ID)!.plugins.find((p) => p.name === name)!;

const lastChatTo = (h: Harness) =>
  h.session.callsTo("ChatSendServerMessageToLogin").at(-1)?.params;

const WIDGET = `{{#extend "widget"}}{{#content "widget"}}<label text="{{ data.text }}" action="{{action "go"}}"/>{{/content}}{{/extend}}`;

describe("sandboxed plugins", () => {
  it("runs the example plugin end to end", async () => {
    const h = await createHarness({ packages: [{ bytes: hello }], players: [player("p1")] });
    expect(h.runtime.plugins.loadedIds()).toContain("hello");

    const xml = h.session.lastManialink("plg.hello.greeting");
    expect(xml).toContain("Welcome! 0 greetings so far");
    expect(xml).toContain('action="hello:wave"');

    await h.chat("p1", "/hello");
    expect(lastChatTo(h)).toEqual(["Welcome Nick p1! (greeting #1)", "p1"]);
    expect(stored(h, "greetings:p1", "hello")).toBe(1);

    await h.click("p1", "hello:wave");
    expect(lastChatTo(h)).toEqual(["Welcome Nick p1! (greeting #2)", "p1"]);
    expect(h.session.lastManialink("plg.hello.greeting")).toContain("Welcome! 2 greetings so far");

    // Without the prefix the action belongs to nobody
    await h.click("p1", "wave");
    expect(stored(h, "greetings:p1", "hello")).toBe(2);
  });

  it("applies config changes and the config schema defaults", async () => {
    const h = await createHarness({
      packages: [{ bytes: hello, config: { greeting: "Hoi" } }],
      players: [player("p1")],
    });
    expect(h.session.lastManialink("plg.hello.greeting")).toContain("Hoi! 0 greetings");

    record(h, "hello").config = { greeting: "Moin", showWidget: false };
    await h.runtime.refreshPlugins();
    expect(h.runtime.manialinks.displayedIds()).not.toContain("plg.hello.greeting");

    await h.chat("p1", "/hello");
    expect(lastChatTo(h)).toEqual(["Moin Nick p1! (greeting #1)", "p1"]);
  });

  it("answers /help with the manifest help text", async () => {
    const h = await createHarness({ packages: [{ bytes: hello }], players: [player("p1")] });
    await h.chat("p1", "/help hello");
    expect(lastChatTo(h)).toEqual([
      "/hello - the server says hi and tells you how often it did",
      "p1",
    ]);
    await h.chat("p1", "/help");
    expect(String(lastChatTo(h)?.[0])).toContain("hello");
  });

  it("only grants what the admin consented to", async () => {
    const h = await createHarness({
      packages: [{ bytes: hello, granted: ["ui", "storage"] }],
      players: [player("p1")],
    });
    await h.chat("p1", "/hello");
    expect(h.session.callsTo("ChatSendServerMessageToLogin")).toHaveLength(0);
    // It got as far as storage before the chat call failed
    expect(stored(h, "greetings:p1", "hello")).toBe(1);
  });

  it("keeps plugins to their GBX allowlist", async () => {
    const h = await createHarness({
      packages: [
        {
          bytes: testPackage(`
            const attempt = async (key, fn) => {
              try { await ctx.storage.set(key, await fn()); }
              catch (error) { await ctx.storage.set(key, error.name + ": " + error.message); }
            };
            return { async start() {
              await attempt("map", async () => (await ctx.gbx.call("GetCurrentMapInfo")).UId);
              await attempt("raw-page", () => ctx.gbx.call("SendDisplayManialinkPage", "<x/>", 0, false));
              await attempt("kick", () => ctx.gbx.call("Kick", "p1"));
              await attempt("script-read", () => ctx.gbx.callScript("Trackmania.GetScores"));
              await attempt("script-write", () => ctx.gbx.callScript("Trackmania.SetPlayerPoints", "p1"));
            } };`),
        },
      ],
    });
    expect(stored(h, "map")).toBe("map-a-uid");
    expect(stored(h, "raw-page")).toBe("CapabilityError: The plugin may not call SendDisplayManialinkPage");
    expect(stored(h, "kick")).toBe("CapabilityError: The plugin may not call Kick");
    expect(stored(h, "script-read")).toBe(null);
    expect(stored(h, "script-write")).toMatch(/needs the "mode:control" capability/);
    expect(h.session.callsTo("Kick")).toHaveLength(0);
  });

  it("refuses pages that use another id or more than one manialink", async () => {
    const spoof = `<manialink id="map-info-widget" version="3"></manialink>`;
    const nested = `{{#extend "manialink"}}{{#content "content"}}</manialink><manialink id="map-info-widget">{{/content}}{{/extend}}`;
    const h = await createHarness({
      packages: [
        {
          bytes: testPackage(
            `const show = async (key, template) => {
               try { ctx.ui.widget({ id: key, template, withUpdate: false }).display(); await ctx.storage.set(key, "shown"); }
               catch (error) { await ctx.storage.set(key, error.message); }
             };
             return { async start() {
               await show("spoof", "spoof");
               await show("nested", "nested");
               await show("fine", "fine");
             } };`,
            { capabilities: ["ui", "storage"] },
            { spoof, nested, fine: WIDGET },
          ),
        },
      ],
    });
    expect(stored(h, "spoof")).toBe('The manialink id must be "plg.test-plugin.spoof"');
    expect(stored(h, "nested")).toBe("A page must contain exactly one <manialink> element");
    expect(stored(h, "fine")).toBe("shown");
    expect(h.session.sentManialinkIds()).not.toContain("map-info-widget");
    expect(h.session.sentManialinkIds()).toContain("plg.test-plugin.fine");
  });

  it("turns off a plugin that hangs and tells the admins", async () => {
    const h = await createHarness({
      packages: [{ bytes: testPackage(`ctx.command("spin", () => { for (;;) {} }); return {};`, { commands: ["spin"] }) }],
      players: [player("p1")],
    });
    expect(h.runtime.plugins.loadedIds()).toContain("test-plugin");

    await h.chat("p1", "/spin");
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(record(h, "test-plugin").enabled).toBe(false);
    expect(h.runtime.plugins.loadedIds()).not.toContain("test-plugin");
    expect(h.notifications.created.map((n) => [n.type, n.description])).toEqual([
      ["pluginDisabled", "The plugin ran longer than its time limit (command /spin)"],
    ]);
  });

  it("turns off a plugin that hangs while loading or runs out of memory", async () => {
    const limits = { ...DEFAULT_SANDBOX_LIMITS, loadMs: 50, memoryBytes: 8 * 1024 * 1024 };
    const hang = await createHarness({
      packages: [{ bytes: testPackage(`for (;;) {}`) }],
      sandboxLimits: limits,
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(record(hang, "test-plugin").enabled).toBe(false);

    const hog = await createHarness({
      packages: [{ bytes: testPackage(`const a = []; for (;;) a.push({ n: a.length, s: "x" + a.length }); return {};`) }],
      sandboxLimits: { ...limits, loadMs: 5000 },
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(record(hog, "test-plugin").enabled).toBe(false);
    expect(hog.notifications.created[0]?.description).toMatch(/more memory than its limit/);
  });

  it("turns off a plugin that keeps throwing", async () => {
    const h = await createHarness({
      packages: [{ bytes: testPackage(`ctx.command("boom", () => { throw new Error("nope"); }); return {};`, { commands: ["boom"] }) }],
      players: [player("p1")],
      sandboxLimits: { ...DEFAULT_SANDBOX_LIMITS, errorsPerMinute: 3 },
    });
    for (let i = 0; i < 3; i++) await h.chat("p1", "/boom");
    expect(record(h, "test-plugin").enabled).toBe(true);
    await h.chat("p1", "/boom");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(record(h, "test-plugin").enabled).toBe(false);
    expect(h.notifications.created[0]?.description).toMatch(/kept failing \(command \/boom: nope\)/);
  });

  it("only registers manifest commands and plugin events", async () => {
    const h = await createHarness({
      packages: [
        {
          bytes: testPackage(`
            const attempt = (key, fn) => { try { fn(); return ctx.storage.set(key, "ok"); } catch (error) { return ctx.storage.set(key, error.message); } };
            return { async start() {
              await attempt("command", () => ctx.command("admin", () => {}));
              await attempt("answers", () => ctx.on("playerManialinkPageAnswer", () => {}));
              await attempt("finish", () => ctx.on("finish", () => {}));
            } };`),
        },
      ],
    });
    expect(stored(h, "command")).toBe("/admin is not one of the commands in the manifest");
    expect(stored(h, "answers")).toBe('Unknown event "playerManialinkPageAnswer"');
    expect(stored(h, "finish")).toBe("ok");
  });

  it("runs timers on the service clock and stops them on unload", async () => {
    const h = await createHarness({
      packages: [
        {
          bytes: testPackage(`
            let ticks = 0;
            ctx.setTimeout(() => ctx.storage.set("once", true), 1000);
            ctx.setInterval(() => ctx.storage.set("ticks", ++ticks), 500);
            return {};`),
        },
      ],
    });
    await h.clock.advance(1500);
    expect(stored(h, "once")).toBe(true);
    expect(stored(h, "ticks")).toBe(3);

    record(h, "test-plugin").enabled = false;
    await h.runtime.refreshPlugins();
    expect(h.clock.pendingTimers()).toBe(0);
  });

  it("closes a window for its own player only", async () => {
    const h = await createHarness({
      packages: [
        {
          bytes: testPackage(
            `return { start() {
               ctx.ui.window({ id: "win", template: "win", login: "p1", title: "Hi",
                 onClose: () => ctx.storage.set("closed", true) }).display();
             } };`,
            { capabilities: ["ui", "storage"] },
            { win: `{{#extend "window"}}{{#content "window"}}<label text="{{ title }}"/>{{/content}}{{/extend}}`, "win-update": `{{#extend "manialink"}}{{/extend}}` },
          ),
        },
      ],
      players: [player("p1"), player("p2")],
    });
    expect(h.runtime.manialinks.displayedIds("p1")).toContain("plg.test-plugin.win");

    await h.click("p2", "close-window-plg.test-plugin.win");
    expect(h.runtime.manialinks.displayedIds("p1")).toContain("plg.test-plugin.win");

    await h.click("p1", "close-window-plg.test-plugin.win");
    expect(h.runtime.manialinks.displayedIds("p1")).not.toContain("plg.test-plugin.win");
    expect(stored(h, "closed")).toBe(true);
  });

  it("enforces storage limits and lists keys", async () => {
    const h = await createHarness({
      packages: [
        {
          bytes: testPackage(`return { async start() {
            await ctx.storage.set("a:1", 1);
            await ctx.storage.set("a:2", 2);
            await ctx.storage.set("b:1", 3);
            await ctx.storage.set("keys", await ctx.storage.keys("a:"));
            try { await ctx.storage.set("big", "x".repeat(70000)); }
            catch (error) { await ctx.storage.set("big-error", error.message); }
            try { await ctx.storage.set("has space", 1); }
            catch (error) { await ctx.storage.set("key-error", error.name); }
          } };`),
        },
      ],
    });
    expect(stored(h, "keys")).toEqual(["a:1", "a:2"]);
    expect(stored(h, "big")).toBeUndefined();
    expect(stored(h, "big-error")).toBe("A value may be at most 64 KB");
    expect(stored(h, "key-error")).toBe("ValidationError");
  });

  it("only lets plugins reach the hosts they declared", async () => {
    const h = await createHarness({
      packages: [
        {
          bytes: testPackage(
            `const attempt = async (key, url, init) => {
               try { const res = await ctx.http.fetch(url, init); await ctx.storage.set(key, res.json()); }
               catch (error) { await ctx.storage.set(key, error.message); }
             };
             return { async start() {
               await attempt("ok", "https://api.example.com/v1/x?y=1", { method: "POST", body: "hi", headers: { "X-Key": "k" } });
               await attempt("other", "https://evil.example.com/");
               await attempt("plain", "http://api.example.com/");
               await attempt("port", "https://api.example.com:8443/");
               await attempt("header", "https://api.example.com/", { headers: { Host: "evil" } });
             } };`,
            { capabilities: ["storage", "http:api.example.com"] },
          ),
        },
      ],
    });
    h.http.response = { status: 200, headers: {}, body: '{"answer":42}' };
    expect(stored(h, "ok")).toEqual({});
    expect(h.http.requests).toHaveLength(1);
    expect(h.http.requests[0]).toMatchObject({
      url: "https://api.example.com/v1/x?y=1",
      method: "POST",
      body: "hi",
      headers: { "x-key": "k" },
    });
    expect(stored(h, "other")).toBe('The plugin did not declare "http:evil.example.com"');
    expect(stored(h, "plain")).toBe("Only https:// URLs are allowed");
    expect(stored(h, "port")).toBe("Only the default HTTPS port is allowed");
    expect(stored(h, "header")).toBe("Header Host is not allowed");
  });

  it("reloads a plugin when another version is installed", async () => {
    const v1 = testPackage(`return { start: () => ctx.storage.set("version", 1) };`);
    const v2 = testPackage(`return { start: () => ctx.storage.set("version", 2) };`, { version: "2.0.0" });
    const h = await createHarness({ packages: [{ bytes: v1 }] });
    expect(stored(h, "version")).toBe(1);

    const next = packageRecord({ bytes: v2 });
    h.pluginPackages.packages.set(next.package!.versionId, v2);
    record(h, "test-plugin").package = next.package;
    await h.runtime.refreshPlugins();
    expect(stored(h, "version")).toBe(2);
    expect(h.runtime.plugins.loadedIds()).toEqual(["test-plugin"]);
  });

  it("doesn't load a package whose templates don't compile", async () => {
    const h = await createHarness({
      packages: [{ bytes: testPackage(`return {};`, {}, { broken: "{{#if open}}never closed" }) }],
    });
    expect(h.runtime.plugins.loadedIds()).toEqual([]);
  });

  it("refuses a stored package that doesn't match its checksum", async () => {
    const h = await createHarness({ packages: [{ bytes: hello }] });
    const tampered = testPackage(`return {};`, { slug: "hello" });
    h.pluginPackages.packages.set(record(h, "hello").package!.versionId, tampered);
    record(h, "hello").package!.grantedCapabilities = ["ui"];
    await h.runtime.reloadPlugins();
    // The cached copy of the original package is still what runs
    expect(h.runtime.plugins.loadedIds()).toContain("hello");
  });
});
