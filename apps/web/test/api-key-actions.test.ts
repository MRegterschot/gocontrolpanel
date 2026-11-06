import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: { user: {} as Record<string, unknown> },
  apiKeys: {
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  servers: { findFirst: vi.fn() },
  groups: { findFirst: vi.fn() },
  audit: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/sentry/report", () => ({ reportException: vi.fn() }));
// The real permission check against a test session
vi.mock("@/lib/auth", async () => {
  const { hasPermissionSync } = await import("@/lib/utils");
  const { ServerError } = await import("@/types/responses");
  return {
    withAuth: async (permissions?: string[], id = "") => {
      if (!hasPermissionSync(mocks.session as never, permissions, id)) {
        throw new ServerError("Unauthorized", "Unauthorized");
      }
      return mocks.session;
    },
  };
});
vi.mock("@/lib/dbclient", () => ({
  getClient: () => ({
    apiKeys: mocks.apiKeys,
    servers: mocks.servers,
    groups: mocks.groups,
  }),
}));
vi.mock("@/actions/database/server-only/audit-logs", () => ({
  withAudit: async (
    write: (tx: unknown) => Promise<unknown>,
    audit: (result: unknown) => unknown[],
  ) => {
    const result = await write({ apiKeys: mocks.apiKeys });
    mocks.audit(...audit(result));
    return result;
  },
}));

import {
  createApiKey,
  renameApiKey,
  revokeApiKey,
} from "@/actions/database/api-keys";
import { hashApiKeyToken } from "@/lib/api-keys/token";
import {
  getApiKeysPaginated,
  getGroupApiKeys,
  getServerApiKeys,
} from "@/services/database/api-keys";

const group = {
  id: "group-1",
  name: "League",
  servers: [{ id: "server-a", name: "A" }],
};

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    login: "login-1",
    displayName: "One",
    admin: false,
    permissions: [],
    servers: [],
    groups: [],
    adminGroups: [],
    projects: [],
    ...overrides,
  };
}

const asUser = (overrides: Record<string, unknown> = {}) => {
  mocks.session.user = user(overrides);
};

const serverKey = {
  target: { type: "server" as const, serverId: "server-a" },
  name: "Bot",
  scopes: ["maps:read" as const],
  expiresInDays: null,
};
const groupKey = {
  ...serverKey,
  target: { type: "group" as const, groupId: "group-1" },
};

function createdRow(data: Record<string, unknown>) {
  return {
    id: "key-1",
    name: data.name,
    prefix: data.prefix,
    scopes: data.scopes,
    serverId: data.serverId,
    groupId: data.groupId,
    expiresAt: data.expiresAt,
    lastUsedAt: null,
    revokedAt: null,
    createdAt: new Date(),
    server: data.serverId ? { id: data.serverId, name: "A" } : null,
    group: data.groupId ? { id: data.groupId, name: "League" } : null,
    createdBy: { id: "user-1", login: "login-1", nickName: "One" },
  };
}

beforeEach(() => {
  asUser();
  mocks.servers.findFirst.mockResolvedValue({ id: "server-a" });
  mocks.groups.findFirst.mockResolvedValue({ id: "group-1" });
  mocks.apiKeys.create.mockImplementation(async ({ data }) => createdRow(data));
  mocks.apiKeys.findMany.mockResolvedValue([]);
  mocks.apiKeys.count.mockResolvedValue(0);
  mocks.apiKeys.findFirst.mockResolvedValue({
    id: "key-1",
    name: "Bot",
    serverId: null,
    groupId: "group-1",
    revokedAt: null,
  });
});

describe("createApiKey", () => {
  it("stores only the hash and returns the token once", async () => {
    asUser({ servers: [{ id: "server-a", name: "A", role: "Admin" }] });

    const { data, error } = await createApiKey(serverKey);

    expect(error).toBeUndefined();
    const stored = mocks.apiKeys.create.mock.calls[0][0].data;
    expect(stored.hash).toBe(hashApiKeyToken(data.token));
    expect(JSON.stringify(stored)).not.toContain(data.token);
    expect(stored).toMatchObject({
      serverId: "server-a",
      groupId: null,
      createdById: "user-1",
      scopes: ["maps:read"],
      expiresAt: null,
    });
    expect(data.key.target).toEqual({
      type: "server",
      id: "server-a",
      name: "A",
    });
    expect(mocks.audit).toHaveBeenCalledWith(
      "user-1",
      "server-a",
      "server.api-keys.create",
      expect.objectContaining({ id: "key-1", scopes: ["maps:read"] }),
    );
  });

  it.each([
    [
      "a direct server admin",
      { servers: [{ id: "server-a", name: "A", role: "Admin" }] },
    ],
    ["a group admin of the server", { groups: [{ ...group, role: "Admin" }] }],
    ["a panel admin", { admin: true }],
  ])("lets %s create a server key", async (_, claims) => {
    asUser(claims);
    expect((await createApiKey(serverKey)).error).toBeUndefined();
  });

  it.each([
    [
      "a server moderator",
      { servers: [{ id: "server-a", name: "A", role: "Moderator" }] },
    ],
    [
      "an admin of another server",
      { servers: [{ id: "server-b", name: "B", role: "Admin" }] },
    ],
    [
      "a user with groups:edit",
      { permissions: ["groups:edit", "servers:edit"] },
    ],
  ])("refuses %s a server key", async (_, claims) => {
    asUser(claims);
    expect((await createApiKey(serverKey)).error).toBe("Unauthorized");
    expect(mocks.apiKeys.create).not.toHaveBeenCalled();
  });

  it("lets a group admin create a group key, audited on the group", async () => {
    asUser({ groups: [{ ...group, role: "Admin" }] });
    const { error } = await createApiKey(groupKey);
    expect(error).toBeUndefined();
    expect(mocks.apiKeys.create.mock.calls[0][0].data).toMatchObject({
      serverId: null,
      groupId: "group-1",
    });
    expect(mocks.audit.mock.calls[0].slice(0, 3)).toEqual([
      "user-1",
      "group-1",
      "group.api-keys.create",
    ]);
  });

  it.each([
    ["a group moderator", { groups: [{ ...group, role: "Moderator" }] }],
    [
      "a server admin in the group",
      { servers: [{ id: "server-a", name: "A", role: "Admin" }] },
    ],
    ["a user with groups:edit", { permissions: ["groups:edit"] }],
  ])("refuses %s a group key", async (_, claims) => {
    asUser(claims);
    expect((await createApiKey(groupKey)).error).toBe("Unauthorized");
  });

  it("refuses a deleted target", async () => {
    asUser({ admin: true });
    mocks.groups.findFirst.mockResolvedValue(null);
    expect((await createApiKey(groupKey)).error).toBe("Not found");
  });

  it.each([
    ["no scopes", { ...serverKey, scopes: [] }],
    ["an unknown scope", { ...serverKey, scopes: ["groups:admin"] }],
    ["no target", { ...serverKey, target: { type: "global" } }],
    ["a blank name", { ...serverKey, name: "  " }],
    ["an odd expiry", { ...serverKey, expiresInDays: 7 }],
  ])("rejects %s", async (_, input) => {
    asUser({ admin: true });
    expect((await createApiKey(input as never)).error).toBeTruthy();
    expect(mocks.apiKeys.create).not.toHaveBeenCalled();
  });

  it("sets the expiry from the chosen days", async () => {
    asUser({ admin: true });
    const before = Date.now();
    await createApiKey({ ...serverKey, expiresInDays: 30 });
    const { expiresAt } = mocks.apiKeys.create.mock.calls[0][0].data;
    expect(expiresAt.getTime() - before).toBeGreaterThanOrEqual(
      30 * 24 * 3600 * 1000 - 1000,
    );
  });
});

describe("revokeApiKey and renameApiKey", () => {
  it("lets any admin of the group revoke its keys", async () => {
    asUser({ id: "user-2", groups: [{ ...group, role: "Admin" }] });
    expect((await revokeApiKey("key-1")).error).toBeUndefined();
    expect(mocks.apiKeys.update).toHaveBeenCalledWith({
      where: { id: "key-1" },
      data: { revokedAt: expect.any(Date) },
    });
    expect(mocks.audit.mock.calls[0][2]).toBe("group.api-keys.revoke");
  });

  it("lets api-keys:revoke revoke but not rename", async () => {
    asUser({ permissions: ["api-keys:revoke"] });
    expect((await revokeApiKey("key-1")).error).toBeUndefined();
    expect((await renameApiKey("key-1", "New")).error).toBe("Unauthorized");
  });

  it("refuses someone without a say over the key", async () => {
    asUser({ groups: [{ ...group, role: "Moderator" }] });
    expect((await revokeApiKey("key-1")).error).toBe("Unauthorized");
    expect((await renameApiKey("key-1", "New")).error).toBe("Unauthorized");
    expect(mocks.apiKeys.update).not.toHaveBeenCalled();
  });

  it("does nothing for an already revoked key", async () => {
    asUser({ admin: true });
    mocks.apiKeys.findFirst.mockResolvedValue({
      id: "key-1",
      name: "Bot",
      serverId: null,
      groupId: "group-1",
      revokedAt: new Date(),
    });
    expect((await revokeApiKey("key-1")).error).toBeUndefined();
    expect(mocks.apiKeys.update).not.toHaveBeenCalled();
  });

  it("answers not found for a missing key", async () => {
    asUser({ admin: true });
    mocks.apiKeys.findFirst.mockResolvedValue(null);
    expect((await revokeApiKey("key-9")).error).toBe("API key not found");
  });

  it("renames for a group admin and audits the change", async () => {
    asUser({ groups: [{ ...group, role: "Admin" }] });
    expect((await renameApiKey("key-1", " Scoreboard ")).error).toBeUndefined();
    expect(mocks.apiKeys.update).toHaveBeenCalledWith({
      where: { id: "key-1" },
      data: { name: "Scoreboard" },
    });
    expect(mocks.audit.mock.calls[0][3]).toEqual({
      id: "key-1",
      from: "Bot",
      to: "Scoreboard",
    });
  });
});

describe("api key reads", () => {
  it("shows a server's keys to its admins only", async () => {
    asUser({ servers: [{ id: "server-a", name: "A", role: "Moderator" }] });
    expect((await getServerApiKeys("server-a")).error).toBe("Unauthorized");

    asUser({ groups: [{ ...group, role: "Admin" }] });
    expect((await getServerApiKeys("server-a")).error).toBeUndefined();
  });

  it("includes group keys that reach the server", async () => {
    asUser({ admin: true });
    await getServerApiKeys("server-a");
    expect(mocks.apiKeys.findMany.mock.calls[1][0].where).toEqual({
      deletedAt: null,
      group: {
        deletedAt: null,
        groupServers: { some: { serverId: "server-a" } },
      },
    });
  });

  it("shows a group's keys to its admins only", async () => {
    asUser({ groups: [{ ...group, role: "Moderator" }] });
    expect((await getGroupApiKeys("group-1")).error).toBe("Unauthorized");
    asUser({ permissions: ["groups:edit"] });
    expect((await getGroupApiKeys("group-1")).error).toBe("Unauthorized");
    asUser({ groups: [{ ...group, role: "Admin" }] });
    expect((await getGroupApiKeys("group-1")).error).toBeUndefined();
  });

  it("shows the overview with api-keys:view only", async () => {
    asUser({ groups: [{ ...group, role: "Admin" }] });
    const pagination = { pageIndex: 0, pageSize: 10 };
    const sorting = { field: "createdAt", order: "desc" as const };
    expect((await getApiKeysPaginated(pagination, sorting, "")).error).toBe(
      "Unauthorized",
    );
    asUser({ permissions: ["api-keys:view"] });
    expect(
      (await getApiKeysPaginated(pagination, sorting, "")).error,
    ).toBeUndefined();
  });

  it("only sorts the overview on known columns", async () => {
    asUser({ admin: true });
    await getApiKeysPaginated(
      { pageIndex: 0, pageSize: 10 },
      { field: "hash", order: "asc" },
      "",
    );
    expect(mocks.apiKeys.findMany.mock.calls[0][0].orderBy[0]).toEqual({
      createdAt: "asc",
    });
  });
});
