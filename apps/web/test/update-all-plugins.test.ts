import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  audit: vi.fn(),
  publish: vi.fn(),
  installed: vi.fn(),
  upsert: vi.fn(),
  plugin: vi.fn(),
  version: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/actions", () => ({
  doServerActionWithAuth: async (
    roles: string[],
    action: (session: unknown) => Promise<unknown>,
  ) => {
    mocks.auth(roles);
    try {
      return { data: await action({ user: { id: "admin" } }) };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },
}));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => ({
    plugins: { findUnique: mocks.plugin },
    pluginVersions: { findUnique: mocks.version },
    serverPlugins: { upsert: mocks.upsert },
  }),
}));
vi.mock("@/lib/gbx-service", () => ({ publishServerEvent: mocks.publish }));
vi.mock("@/actions/database/server-only/audit-logs", () => ({
  logAudit: mocks.audit,
}));
vi.mock("@/lib/actor", () => ({ actorFromSession: vi.fn() }));
vi.mock("@/lib/plugin-access", () => ({ uploadOwnerFilter: () => ({}) }));
vi.mock("@/actions/server-only/plugins", () => ({}));
vi.mock("@/lib/marketplace", () => ({
  downloadMarketplacePackage: vi.fn(),
  findMarketplacePlugin: vi.fn(),
  getMarketplaceIndex: () => Promise.reject(new Error("offline")),
}));
vi.mock("@/services/plugins", () => ({
  getInstalledPlugins: mocks.installed,
  storedManifest: (manifest: unknown) => manifest,
}));

import { updateAllServerPlugins } from "@/actions/plugins";

const plugin = (slug: string, over: Record<string, unknown> = {}) => ({
  pluginId: `id-${slug}`,
  slug,
  name: slug,
  source: "marketplace",
  version: "1.0.0",
  grantedCapabilities: ["ui"],
  update: { version: "1.1.0", capabilities: ["ui"], yanked: false },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.plugin.mockResolvedValue({ id: "pid", source: "marketplace" });
  mocks.version.mockResolvedValue({
    id: "v2",
    sha256: "x",
    manifest: { capabilities: ["ui"] },
    yanked: false,
  });
});

describe("updateAllServerPlugins", () => {
  it("updates what needs no new permissions and leaves the rest", async () => {
    mocks.installed.mockResolvedValue({
      data: [
        plugin("a"),
        plugin("b", {
          update: {
            version: "2.0.0",
            capabilities: ["ui", "chat:send"],
            yanked: false,
          },
        }),
        plugin("c", { update: null }),
        plugin("d", {
          update: { version: "1.1.0", capabilities: ["ui"], yanked: true },
        }),
      ],
    });

    const res = await updateAllServerPlugins("s1");

    expect(mocks.auth).toHaveBeenCalledWith([
      "servers:s1:admin",
      "group:servers:s1:admin",
    ]);
    expect(res).toEqual({
      data: { updated: ["a"], needsConsent: ["b"], failed: [] },
    });
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.publish).toHaveBeenCalledWith({
      type: "server.plugins.updated",
      serverId: "s1",
    });
  });

  it("keeps going when one plugin fails", async () => {
    mocks.installed.mockResolvedValue({ data: [plugin("a"), plugin("b")] });
    mocks.plugin.mockRejectedValueOnce(new Error("db down"));

    const res = await updateAllServerPlugins("s1");

    expect(res).toEqual({
      data: { updated: ["b"], needsConsent: [], failed: ["a"] },
    });
  });

  it("returns the error when the plugins cannot be read", async () => {
    mocks.installed.mockResolvedValue({ error: "No access" });
    expect((await updateAllServerPlugins("s1")).error).toBe("No access");
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
