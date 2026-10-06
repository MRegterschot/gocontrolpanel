import type { PluginAppearance, ServerAppearance } from "@gcp/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  update: vi.fn(),
  updateServers: vi.fn(),
  auth: vi.fn(),
  publish: vi.fn(),
  audit: vi.fn(),
  allowed: true,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/actions", () => ({
  doServerActionWithAuth: async (
    roles: string[],
    action: (session: unknown) => Promise<unknown>,
  ) => {
    mocks.auth(roles);
    if (!mocks.allowed) return { error: "Unauthorized" };
    try {
      return { data: await action({ user: { id: "admin" } }) };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },
}));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => ({
    serverPlugins: { findUnique: mocks.find, update: mocks.update },
    servers: { updateMany: mocks.updateServers },
  }),
}));
vi.mock("@/lib/gbx-service", () => ({ publishServerEvent: mocks.publish }));
vi.mock("@/actions/database/server-only/audit-logs", () => ({
  logAudit: mocks.audit,
}));
vi.mock("@/lib/marketplace", () => ({
  downloadMarketplacePackage: vi.fn(),
  findMarketplacePlugin: vi.fn(),
  getMarketplaceIndex: vi.fn(),
}));
vi.mock("@/services/plugins", () => ({
  storedManifest: (manifest: unknown) => manifest,
}));

import {
  saveServerAppearance,
  saveServerPluginAppearance,
} from "@/actions/plugins";

const appearance: PluginAppearance = {
  rules: [
    {
      page: "",
      element: "label",
      id: "",
      className: "",
      attributes: { textsize: "2" },
    },
  ],
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.allowed = true;
  mocks.find.mockResolvedValue({
    plugin: { name: "hello", source: "upload" },
    version: { manifest: { capabilities: ["ui"] } },
  });
});

describe("saving plugin appearance", () => {
  it("requires server admin access and scopes both the read and write to the server", async () => {
    expect(
      await saveServerPluginAppearance("server-a", "plugin", appearance),
    ).toEqual({ data: undefined });
    expect(mocks.auth).toHaveBeenCalledWith([
      "servers:server-a:admin",
      "group:servers:server-a:admin",
    ]);
    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          serverId_pluginId: { serverId: "server-a", pluginId: "plugin" },
        },
      }),
    );
    expect(mocks.update).toHaveBeenCalledWith({
      where: {
        serverId_pluginId: { serverId: "server-a", pluginId: "plugin" },
      },
      data: { appearance },
    });
    expect(mocks.publish).toHaveBeenCalledWith({
      type: "server.plugins.updated",
      serverId: "server-a",
    });
    expect(mocks.audit).toHaveBeenCalledWith(
      "admin",
      "server-a",
      "server.plugins.appearance.edit",
      { slug: "hello", rules: 1 },
    );
  });
  it("does not read or write for an unauthorized caller", async () => {
    mocks.allowed = false;
    expect(
      (await saveServerPluginAppearance("server-a", "plugin", appearance))
        .error,
    ).toBe("Unauthorized");
    expect(mocks.find).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects plugins not installed on the requested server", async () => {
    mocks.find.mockResolvedValue(null);
    expect(
      (await saveServerPluginAppearance("server-b", "plugin", appearance))
        .error,
    ).toContain("not installed");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("validates attributes again on the server", async () => {
    const invalid = {
      rules: [{ ...appearance.rules[0], attributes: { action: "quit" } }],
    } as unknown as PluginAppearance;
    expect(
      (await saveServerPluginAppearance("server-a", "plugin", invalid)).error,
    ).toBe("Invalid request");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.publish).not.toHaveBeenCalled();
  });
  it("rejects non-UI plugins and allows resetting styles", async () => {
    expect(
      (await saveServerPluginAppearance("server-a", "plugin", { rules: [] }))
        .error,
    ).toBeUndefined();
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { appearance: { rules: [] } } }),
    );
    mocks.update.mockClear();
    mocks.find.mockResolvedValue({
      plugin: { name: "hello", source: "upload" },
      version: { manifest: { capabilities: [] } },
    });
    expect(
      (await saveServerPluginAppearance("server-a", "plugin", appearance))
        .error,
    ).toContain("no Manialink UI");
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

describe("saving server-wide plugin appearance", () => {
  const theme: ServerAppearance = {
    theme: { font: "Oswald", textColor: "", windowTitleBarColor: "036" },
    rules: [],
  };

  it("requires server admin access and drops cleared theme fields", async () => {
    mocks.updateServers.mockResolvedValue({ count: 1 });
    const result = await saveServerAppearance("s1", theme);
    expect(result.error).toBeUndefined();
    expect(mocks.auth).toHaveBeenCalledWith([
      "servers:s1:admin",
      "group:servers:s1:admin",
    ]);
    expect(mocks.updateServers).toHaveBeenCalledWith({
      where: { id: "s1", deletedAt: null },
      data: {
        pluginAppearance: {
          theme: { font: "Oswald", windowTitleBarColor: "036" },
          rules: [],
        },
      },
    });
    expect(mocks.publish).toHaveBeenCalledWith({
      type: "server.plugins.updated",
      serverId: "s1",
    });
    expect(mocks.audit).toHaveBeenCalledWith(
      "admin",
      "s1",
      "server.plugins.theme.edit",
      { theme: ["font", "windowTitleBarColor"], rules: 0 },
    );
  });

  it("rejects unauthorized callers, invalid values and deleted servers", async () => {
    mocks.allowed = false;
    expect((await saveServerAppearance("s1", theme)).error).toBeTruthy();
    mocks.allowed = true;
    const invalid = { theme: { textColor: "red" }, rules: [] };
    expect((await saveServerAppearance("s1", invalid)).error).toBeTruthy();
    expect(mocks.updateServers).not.toHaveBeenCalled();

    mocks.updateServers.mockResolvedValue({ count: 0 });
    expect((await saveServerAppearance("gone", theme)).error).toMatch(
      /not found/,
    );
    expect(mocks.publish).not.toHaveBeenCalled();
  });
});
