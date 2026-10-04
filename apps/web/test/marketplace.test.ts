import { createPluginPackage, sha256Hex } from "@tmcp/shared/plugin-package";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const config = vi.hoisted(() => ({ MARKETPLACE: { INDEX_URL: "" } }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/config", () => ({ default: config }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));

import {
  clearMarketplaceCache,
  downloadMarketplacePackage,
  findMarketplacePlugin,
  getMarketplaceIndex,
  getMarketplaceReadme,
  marketplaceUrl,
} from "@/lib/marketplace";

const hello = createPluginPackage({
  "tmcp-plugin.json": JSON.stringify({
    slug: "hello",
    name: "Hello",
    version: "1.0.0",
    sdk: 1,
    description: "Hi",
    author: "Tests",
    capabilities: ["ui"],
  }),
  "index.js": "globalThis.__tmcpRegister({ create() { return {}; } });",
});

const version = (overrides: Record<string, unknown> = {}) => ({
  version: "1.0.0",
  sdk: 1,
  url: "packages/hello-1.0.0.zip",
  sha256: sha256Hex(hello),
  size: hello.byteLength,
  capabilities: ["ui"],
  publishedAt: "2026-10-01T00:00:00Z",
  ...overrides,
});

const index = {
  schemaVersion: 1,
  generatedAt: "2026-10-04T00:00:00Z",
  repository: "https://github.com/acme/plugins",
  plugins: [
    {
      slug: "hello",
      name: "Hello",
      description: "Hi",
      author: "Tests",
      readme: "packages/README.md",
      versions: [version()],
    },
  ],
};

let server: Server;
let requests: string[] = [];
let failIndex = false;

beforeAll(async () => {
  server = createServer((req, res) => {
    requests.push(req.url ?? "");
    if (req.url === "/plugins/index.json") {
      if (failIndex) {
        res.writeHead(500);
        return res.end();
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(index));
    }
    if (req.url === "/plugins/packages/hello-1.0.0.zip") {
      res.writeHead(200);
      return res.end(Buffer.from(hello));
    }
    if (req.url === "/plugins/packages/README.md") {
      res.writeHead(200);
      return res.end("# Hello");
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  config.MARKETPLACE.INDEX_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/plugins/index.json`;
});

afterAll(() => server.close());

beforeEach(() => {
  clearMarketplaceCache();
  requests = [];
  failIndex = false;
  vi.useRealTimers();
});

async function plugin() {
  const loaded = await getMarketplaceIndex();
  return findMarketplacePlugin(loaded!, "hello")!;
}

describe("marketplace", () => {
  it("loads the index once and serves it from the cache", async () => {
    expect((await getMarketplaceIndex())?.plugins.map((p) => p.slug)).toEqual(["hello"]);
    await getMarketplaceIndex();
    expect(requests).toEqual(["/plugins/index.json"]);
  });

  it("keeps the last index when GitHub is down", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    await getMarketplaceIndex();
    failIndex = true;
    vi.setSystemTime(Date.now() + 6 * 60 * 1000);
    expect((await getMarketplaceIndex())?.plugins).toHaveLength(1);
    expect(requests).toEqual(["/plugins/index.json", "/plugins/index.json"]);
  });

  it("fails clearly without a cached index", async () => {
    failIndex = true;
    await expect(getMarketplaceIndex()).rejects.toThrow(/answered 500/);
  });

  it("is off without an index URL", async () => {
    const url = config.MARKETPLACE.INDEX_URL;
    config.MARKETPLACE.INDEX_URL = "";
    try {
      expect(await getMarketplaceIndex()).toBeNull();
    } finally {
      config.MARKETPLACE.INDEX_URL = url;
    }
  });

  it("downloads a package that matches its entry", async () => {
    const entry = await plugin();
    const { pkg } = await downloadMarketplacePackage(entry, entry.versions[0]);
    expect(pkg.manifest.slug).toBe("hello");
    expect(await getMarketplaceReadme(entry)).toBe("# Hello");
  });

  it("refuses packages off the index's origin, with another checksum or other capabilities", async () => {
    const entry = await plugin();
    await expect(
      downloadMarketplacePackage(entry, version({ url: "https://evil.example/hello.zip" }) as never),
    ).rejects.toThrow(/not hosted by the marketplace/);
    await expect(
      downloadMarketplacePackage(entry, version({ sha256: "0".repeat(64) }) as never),
    ).rejects.toThrow(/does not match the marketplace's checksum/);
    await expect(
      downloadMarketplacePackage(entry, version({ capabilities: [] }) as never),
    ).rejects.toThrow(/does not match its marketplace entry/);
  });

  it("resolves references on the index origin only", () => {
    expect(marketplaceUrl("packages/a.png")).toBe(
      config.MARKETPLACE.INDEX_URL.replace("index.json", "packages/a.png"),
    );
    expect(marketplaceUrl("https://evil.example/a.png")).toBeNull();
    expect(marketplaceUrl(undefined)).toBeNull();
  });
});
