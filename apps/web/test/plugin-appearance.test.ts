import type { ServerAppearance } from "@gcp/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
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

import { saveServerAppearance } from "@/actions/plugins";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.allowed = true;
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
