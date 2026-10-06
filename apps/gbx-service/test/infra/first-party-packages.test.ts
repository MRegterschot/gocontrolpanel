import {
  createPluginPackage,
  readPluginPackage,
} from "@gcp/shared/plugin-package";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadFirstPartyPackages } from "../../src/infra/first-party-packages";
import { silentLogger } from "../fakes/logger";

const indexUrl = "https://registry.example/index.json";
const bytes = createPluginPackage({
  "tmcp-plugin.json": JSON.stringify({
    slug: "map-info",
    name: "Map info",
    description: "Displays the current map",
    author: "Test",
    version: "1.0.1",
    sdk: 1,
    entry: "index.js",
    capabilities: ["ui"],
  }),
  "index.js": "globalThis.__tmcpRegister({});",
});
const pkg = readPluginPackage(bytes);
function index(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    generatedAt: "2026-10-05T12:00:00Z",
    plugins: [
      {
        slug: "map-info",
        name: "Map info",
        description: "Displays the current map",
        author: "Test",
        versions: [
          {
            version: "1.0.1",
            sdk: 1,
            url: "map-info.zip",
            sha256: pkg.sha256,
            size: bytes.byteLength,
            capabilities: ["ui"],
            publishedAt: "2026-10-05T12:00:00Z",
            ...overrides,
          },
        ],
      },
    ],
  };
}
function serve(entry = index(), archive: Uint8Array = bytes) {
  return vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url === indexUrl ? Response.json(entry) : new Response(archive),
    ),
  );
}
afterEach(() => vi.unstubAllGlobals());
describe("registry first-party packages", () => {
  it("loads a verified registry package", async () => {
    serve();
    const result = await loadFirstPartyPackages(indexUrl, silentLogger);
    expect(result).toHaveLength(1);
    expect(result[0].pkg.sha256).toBe(pkg.sha256);
    expect(fetch).toHaveBeenCalledWith(
      "https://registry.example/map-info.zip",
      expect.anything(),
    );
  });
  it.each([
    { url: "https://other.example/package.zip" },
    { sha256: "a".repeat(64) },
    { version: "2.0.0" },
    { capabilities: ["chat:send"] },
    { size: 1 },
  ])(
    "refuses a package that does not match the registry: %j",
    async (overrides) => {
      serve(index(overrides));
      expect(await loadFirstPartyPackages(indexUrl, silentLogger)).toEqual([]);
    },
  );
  it("does not fetch withdrawn versions", async () => {
    serve(index({ yanked: true }));
    expect(await loadFirstPartyPackages(indexUrl, silentLogger)).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("ignores third-party registry packages", async () => {
    const entry = index();
    entry.plugins[0].slug = "community-map-info";
    serve(entry);
    expect(await loadFirstPartyPackages(indexUrl, silentLogger)).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("keeps startup working when the registry is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await loadFirstPartyPackages(indexUrl, silentLogger)).toEqual([]);
  });
  it("does not fetch when the marketplace is disabled", async () => {
    serve();
    expect(await loadFirstPartyPackages("", silentLogger)).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
});
