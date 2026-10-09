import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  audit: vi.fn(),
  publish: vi.fn(),
  updateServers: vi.fn(),
  updateGroups: vi.fn(),
  groupServers: vi.fn(),
  servers: vi.fn(),
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
    servers: { updateMany: mocks.updateServers, findMany: mocks.servers },
    groups: { updateMany: mocks.updateGroups },
    groupServers: { findMany: mocks.groupServers },
  }),
}));
vi.mock("@/lib/gbx-service", () => ({ publishServerEvent: mocks.publish }));
vi.mock("@/actions/database/server-only/audit-logs", () => ({
  logAudit: mocks.audit,
}));

import { updateGroupTheme, updateServerTheme } from "@/actions/database/themes";
import { Prisma } from "@gcp/db";

const palette = {
  foreground: "abc",
  background: "111",
  foregroundMuted: "CCC",
  backgroundMuted: "333",
};
const theme = { quad: palette, label: palette };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updateServers.mockResolvedValue({ count: 1 });
  mocks.updateGroups.mockResolvedValue({ count: 1 });
});

describe("server themes", () => {
  it("lets server admins save a normalized theme and tells the service", async () => {
    expect(await updateServerTheme("s1", theme)).toEqual({ data: undefined });
    expect(mocks.auth).toHaveBeenCalledWith([
      "servers:s1:admin",
      "group:servers:s1:admin",
    ]);
    expect(mocks.updateServers).toHaveBeenCalledWith({
      where: { id: "s1", deletedAt: null },
      data: {
        theme: {
          quad: { ...palette, foreground: "ABC" },
          label: { ...palette, foreground: "ABC" },
        },
      },
    });
    expect(mocks.publish).toHaveBeenCalledWith({
      type: "server.updated",
      serverId: "s1",
    });
  });

  it("clears the theme with null and refuses invalid colors", async () => {
    await updateServerTheme("s1", null);
    expect(mocks.updateServers).toHaveBeenCalledWith(
      expect.objectContaining({ data: { theme: Prisma.DbNull } }),
    );
    const bad = await updateServerTheme("s1", {
      ...theme,
      quad: { ...palette, background: "#12" },
    });
    expect(bad.error).toContain("three hex digits");
    expect(mocks.updateServers).toHaveBeenCalledTimes(1);
  });

  it("refuses a deleted server", async () => {
    mocks.updateServers.mockResolvedValue({ count: 0 });
    expect((await updateServerTheme("gone", theme)).error).toBe(
      "Server not found",
    );
    expect(mocks.publish).not.toHaveBeenCalled();
  });
});

describe("group themes", () => {
  it("checks group permissions and updates every active server of the group", async () => {
    mocks.groupServers.mockResolvedValue([
      { serverId: "a" },
      { serverId: "b" },
    ]);
    mocks.servers.mockResolvedValue([{ id: "a" }]);

    await updateGroupTheme("g1", theme);

    expect(mocks.auth).toHaveBeenCalledWith(["groups:edit", "groups:g1:admin"]);
    expect(mocks.servers).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["a", "b"] }, deletedAt: null },
      }),
    );
    expect(mocks.publish).toHaveBeenCalledTimes(1);
    expect(mocks.publish).toHaveBeenCalledWith({
      type: "server.updated",
      serverId: "a",
    });
  });
});
