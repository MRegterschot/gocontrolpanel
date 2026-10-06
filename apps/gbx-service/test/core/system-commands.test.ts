import { describe, expect, it, vi } from "vitest";
import {
  SystemCommands,
  formatDuration,
} from "../../src/core/chat/system-commands";
import { definePlugin } from "../../src/core/plugins/sdk";
import { FakeClock, flush } from "../fakes/clock";
import { createHarness, player } from "../fakes/harness";
import { silentLogger } from "../fakes/logger";

const privateReplies = (h: Awaited<ReturnType<typeof createHarness>>) =>
  h.session.calls
    .filter((call) => call.method === "ChatSendServerMessageToLogin")
    .map((call) => call.params[0] as string);
const services = (admin = true) => ({
  isAdmin: vi.fn(async () => admin),
  checkDatabase: vi.fn(async () => {}),
  checkRedis: vi.fn(async () => {}),
});

describe("native system commands", () => {
  it("shows mode and separates spectators from drivers", async () => {
    const h = await createHarness({
      server: { enableHelpCommand: false },
      players: [player("driver"), player("spec", { SpectatorStatus: 1 })],
    });
    await h.chat("driver", "/STATUS");
    expect(privateReplies(h)).toContain(
      "Connection: connected. Mode: rounds. Players: 1. Spectators: 1.",
    );
    expect(
      h.session.calls.filter((call) => call.method === "ChatSendServerMessage"),
    ).toEqual([]);
  });

  it("resets connection uptime when the server reconnects", async () => {
    const h = await createHarness();
    await h.clock.advance(62000);
    await h.chat("p1", "/uptime");
    expect(privateReplies(h).at(-1)).toContain("Server connection: 1m 2s.");
    await h.runtime.disconnect();
    await h.clock.advance(5000);
    await h.runtime.reconnect();
    await h.chat("p1", "/uptime");
    expect(privateReplies(h).at(-1)).toContain("Server connection: 0s.");
  });

  it("lists versions and distinguishes disabled, loaded, and non-running plugins", async () => {
    const pluginHandler = vi.fn();
    const h = await createHarness({
      plugins: [
        definePlugin({
          id: "live",
          create: (ctx) => {
            ctx.command("status", pluginHandler);
            return {};
          },
        }),
      ],
      server: {
        plugins: [
          { pluginId: "live", name: "live", enabled: true, config: null },
        ],
      },
    });
    h.runtime.state.plugins = [
      ...h.runtime.state.plugins,
      {
        pluginId: "p1",
        name: "off",
        enabled: false,
        config: null,
        package: {
          version: "1.2.3",
          versionId: "v1",
          sha256: "a",
          source: "marketplace",
          grantedCapabilities: [],
        },
      },
      { pluginId: "p2", name: "wrong-mode", enabled: true, config: null },
    ];
    await h.chat("p1", "/plugins");
    expect(privateReplies(h)).toContain("live builtin: enabled, running.");
    await h.chat("p1", "/status");
    expect(pluginHandler).not.toHaveBeenCalled();
    expect(privateReplies(h)).toContain("off 1.2.3: disabled.");
    expect(privateReplies(h)).toContain(
      "wrong-mode builtin: enabled, not running.",
    );
  });

  it("handles an empty plugin list", async () => {
    const h = await createHarness();
    await h.chat("p1", "/plugins");
    expect(privateReplies(h)).toContain("No plugins installed on this server.");
  });

  it("pings XML-RPC instead of reporting player gameplay latency", async () => {
    const h = await createHarness();
    h.session.respond("GetVersion", async () => {
      await h.clock.advance(42);
      return {};
    });
    await h.chat("p1", "/ping");
    expect(privateReplies(h)).toContain(
      "Dedicated server XML-RPC response time: 42 ms.",
    );
  });

  it.each(["sysinfo", "diagnostics"])(
    "restricts /%s to admins before running probes",
    async (command) => {
      const checks = services(false);
      const h = await createHarness({ systemCommands: checks });
      await h.chat("p1", `/${command}`);
      expect(privateReplies(h)).toContain(
        `/${command} is only available to server admins.`,
      );
      expect(checks.isAdmin).toHaveBeenCalledWith("server-1", "p1");
      expect(checks.checkDatabase).not.toHaveBeenCalled();
      expect(checks.checkRedis).not.toHaveBeenCalled();
      expect(
        h.session.calls.filter((call) => call.method === "GetVersion"),
      ).toEqual([]);
    },
  );

  it("shows runtime and memory information privately to admins", async () => {
    const h = await createHarness({ systemCommands: services() });
    await h.chat("p1", "/sysinfo");
    expect(privateReplies(h).join(" ")).toMatch(/Runtime: Node v\d+/);
    expect(privateReplies(h).join(" ")).toContain("Memory: RSS");
    expect(privateReplies(h).join(" ")).toContain("Host CPU load (1m):");
  });

  it("reports each diagnostic separately without leaking error details", async () => {
    const checks = services();
    checks.checkRedis.mockRejectedValue(
      new Error("redis://user:secret@private-host"),
    );
    const h = await createHarness({ systemCommands: checks });
    await h.chat("p1", "/diagnostics");
    const text = privateReplies(h).join(" ");
    expect(text).toContain("Database: OK");
    expect(text).toContain("Redis: unavailable");
    expect(text).toContain("GBX: OK");
    expect(text).not.toMatch(/secret|private-host/);
  });

  it("fails closed when checking admin permissions fails", async () => {
    const checks = services();
    checks.isAdmin.mockRejectedValue(new Error("database offline"));
    const h = await createHarness({ systemCommands: checks });
    await h.chat("p1", "/diagnostics");
    expect(privateReplies(h)).toContain(
      "Could not complete /diagnostics. Try again later.",
    );
    expect(checks.checkDatabase).not.toHaveBeenCalled();
  });

  it("bounds diagnostics when a dependency never responds and clears timers", async () => {
    const checks = services();
    checks.checkDatabase.mockImplementation(() => new Promise(() => {}));
    const h = await createHarness({ systemCommands: checks });
    await h.chat("p1", "/diagnostics");
    await h.clock.advance(3000);
    await flush();
    expect(privateReplies(h).join(" ")).toContain("Database: unavailable");
    expect(privateReplies(h).join(" ")).toContain("Redis: OK");
    expect(h.clock.pendingTimers()).toEqual(0);
  });

  it("lists the new native commands and their help", async () => {
    const h = await createHarness();
    await h.chat("p1", "/help");
    expect(privateReplies(h).join(" ")).toContain(
      "/uptime, /status, /plugins, /ping, /sysinfo, /diagnostics",
    );
    await h.chat("p1", "/help diagnostics");
    expect(privateReplies(h).at(-1)).toContain("server admins only");
  });

  it("formats service uptime and disconnected state", async () => {
    const reply = vi.fn(async () => {});
    const clock = new FakeClock();
    const h = await createHarness({ connect: false });
    const commands = new SystemCommands({
      serverId: "s",
      state: h.runtime.state,
      gbx: h.runtime.gbx,
      clock,
      log: silentLogger,
      reply,
      connected: () => false,
      connectedAt: () => null,
      loadedPlugins: () => [],
      serviceUptime: () => 90061,
    });
    await commands.dispatch("uptime", "p1");
    expect(reply).toHaveBeenCalledWith(
      "p1",
      "Service uptime: 1d 1h 1m 1s. Server connection: disconnected.",
    );
    expect(formatDuration(-1)).toBe("0s");
  });
});
