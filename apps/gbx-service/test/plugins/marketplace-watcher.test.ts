import type { MarketplaceIndex } from "@tmcp/shared";
import { describe, expect, it } from "vitest";
import { MarketplaceWatcher } from "../../src/core/plugins/marketplace-watcher";
import type { PluginCatalogRepository, PluginYank, YankedInstall } from "../../src/core/ports";
import { FakeClock, flush } from "../fakes/clock";
import { silentLogger } from "../fakes/logger";

const version = (v: string, extra: Record<string, unknown> = {}) => ({
  version: v,
  sdk: 1,
  url: `packages/hello-${v}.zip`,
  sha256: "a".repeat(64),
  size: 10,
  capabilities: [],
  gamemodes: [],
  commands: [],
  publishedAt: "2026-10-01T00:00:00Z",
  yanked: false,
  ...extra,
});

function index(...versions: ReturnType<typeof version>[]): MarketplaceIndex {
  return {
    schemaVersion: 1,
    generatedAt: "2026-10-04T00:00:00Z",
    plugins: [
      {
        slug: "hello",
        name: "Hello",
        description: "Hi",
        author: "A",
        tags: [],
        screenshots: [],
        versions: versions as MarketplaceIndex["plugins"][number]["versions"],
      },
    ],
  };
}

class FakeCatalog implements PluginCatalogRepository {
  readonly calls: PluginYank[][] = [];
  installs: YankedInstall[] = [];

  async applyYanks(yanks: PluginYank[]) {
    this.calls.push(yanks);
    const affected = this.installs.filter((i) => yanks.some((y) => y.slug === i.name && y.version === i.version));
    this.installs = this.installs.filter((i) => !affected.includes(i));
    return affected;
  }
}

describe("marketplace watcher", () => {
  it("turns off installs of yanked versions with the reason", async () => {
    const catalog = new FakeCatalog();
    catalog.installs = [
      { serverId: "s1", pluginId: "p", name: "hello", version: "1.0.0", reason: "Malware" },
      { serverId: "s2", pluginId: "p", name: "hello", version: "1.1.0", reason: null },
    ];
    const disabled: [string, string][] = [];
    const watcher = new MarketplaceWatcher({
      source: { fetch: async () => index(version("1.0.0", { yanked: true, yankReason: "Malware" }), version("1.1.0")) },
      catalog,
      disable: async (install, reason) => {
        disabled.push([install.serverId, reason]);
      },
      clock: new FakeClock(),
      log: silentLogger,
      intervalMs: 60_000,
    });

    await watcher.check();
    expect(catalog.calls).toEqual([[{ slug: "hello", version: "1.0.0", reason: "Malware" }]]);
    expect(disabled).toEqual([["s1", "Version 1.0.0 was withdrawn from the marketplace: Malware"]]);
  });

  it("keeps checking on an interval and survives a failing index", async () => {
    const clock = new FakeClock();
    let fetches = 0;
    const watcher = new MarketplaceWatcher({
      source: {
        fetch: async () => {
          fetches++;
          if (fetches === 1) throw new Error("GitHub is down");
          return index(version("1.0.0"));
        },
      },
      catalog: new FakeCatalog(),
      disable: async () => undefined,
      clock,
      log: silentLogger,
      intervalMs: 60_000,
    });

    watcher.start();
    await flush();
    expect(fetches).toBe(1);
    await clock.advance(60_000);
    expect(fetches).toBe(2);

    watcher.stop();
    await clock.advance(120_000);
    expect(fetches).toBe(2);
  });

  it("can wait one interval before its first check", async () => {
    const clock = new FakeClock();
    let fetches = 0;
    const watcher = new MarketplaceWatcher({
      source: {
        fetch: async () => {
          fetches++;
          return index(version("1.0.0"));
        },
      },
      catalog: new FakeCatalog(),
      disable: async () => undefined,
      clock,
      log: silentLogger,
      intervalMs: 60_000,
    });

    watcher.start(false);
    await flush();
    expect(fetches).toBe(0);
    await clock.advance(60_000);
    expect(fetches).toBe(1);
    watcher.stop();
  });
});
