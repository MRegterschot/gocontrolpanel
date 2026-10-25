import { serverPermissions } from "@tmcontrolpanel/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findKey: vi.fn(),
  updateKey: vi.fn(),
  findUser: vi.fn(),
  findGroups: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => ({
    apiKeys: { findUnique: mocks.findKey, update: mocks.updateKey },
    users: { findUnique: mocks.findUser },
    groups: { findMany: mocks.findGroups },
  }),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/sentry/report", () => ({ reportException: vi.fn() }));

import { auditLogData } from "@/actions/database/server-only/audit-logs";
import { actorHasPermission } from "@/lib/actor";
import { authenticateApiKey } from "@/lib/api-keys/authenticate";
import { runWithApiKey } from "@/lib/api-keys/context";
import {
  bearerApiKeyToken,
  generateApiKeyToken,
  hashApiKeyToken,
} from "@/lib/api-keys/token";

const NOW = new Date("2026-10-21T12:00:00Z");
const serverA = { id: "server-a", name: "A", description: "a" };
const serverB = { id: "server-b", name: "B", description: "b" };
const serverC = { id: "server-c", name: "C", description: "c" };
const admin = [...serverPermissions.admin];
const moderator = [...serverPermissions.moderator];
const { token } = generateApiKeyToken();
const header = `Bearer ${token}`;

function key(overrides: Record<string, unknown> = {}) {
  return {
    id: "key-1",
    name: "Bot",
    scopes: ["maps:read", "jukebox:write"],
    serverId: serverA.id,
    groupId: null,
    expiresAt: null,
    revokedAt: null,
    deletedAt: null,
    lastUsedAt: null,
    createdBy: { login: "creator" },
    server: { ...serverA, deletedAt: null },
    group: null,
    ...overrides,
  };
}

function groupKey(overrides: Record<string, unknown> = {}) {
  return key({
    serverId: null,
    groupId: "group-1",
    server: null,
    group: {
      id: "group-1",
      name: "League",
      deletedAt: null,
      groupServers: [{ server: serverA }, { server: serverB }],
    },
    ...overrides,
  });
}

function creator(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    login: "creator",
    nickName: "Creator",
    admin: false,
    permissions: [],
    userServers: [],
    groupMembers: [],
    hetznerProjectUsers: [],
    ...overrides,
  };
}

const serverAdmin = () =>
  creator({ userServers: [{ role: "Admin", server: serverA }] });
const groupMember = (role: string) =>
  creator({
    groupMembers: [
      {
        role,
        group: {
          id: "group-1",
          name: "League",
          groupServers: [{ server: serverA }, { server: serverB }],
        },
      },
    ],
  });

beforeEach(() => {
  mocks.findGroups.mockResolvedValue([]);
  mocks.updateKey.mockResolvedValue({});
  mocks.findUser.mockResolvedValue(serverAdmin());
  mocks.findKey.mockResolvedValue(key());
});

describe("api key tokens", () => {
  it("generates a prefixed token and stores only its hash", () => {
    const generated = generateApiKeyToken();
    expect(generated.token).toMatch(/^gcp_[A-Za-z0-9_-]{43}$/);
    expect(generated.token.startsWith(generated.prefix)).toBe(true);
    expect(generated.prefix).toHaveLength(12);
    expect(generated.hash).toBe(hashApiKeyToken(generated.token));
    expect(generated.hash).not.toContain(generated.token);
    expect(generateApiKeyToken().token).not.toBe(generated.token);
  });

  it("reads the token from a bearer header only", () => {
    expect(bearerApiKeyToken(header)).toBe(token);
    expect(bearerApiKeyToken(`bearer ${token}`)).toBe(token);
    expect(bearerApiKeyToken(null)).toBeNull();
    expect(bearerApiKeyToken(token)).toBeNull();
    expect(bearerApiKeyToken(`Basic ${token}`)).toBeNull();
    expect(bearerApiKeyToken("Bearer gcp_short")).toBeNull();
    expect(bearerApiKeyToken(`Bearer ${token} extra`)).toBeNull();
  });
});

describe("authenticateApiKey", () => {
  it("looks the key up by the token's hash", async () => {
    await authenticateApiKey(header, NOW);
    expect(mocks.findKey).toHaveBeenCalledWith(
      expect.objectContaining({ where: { hash: hashApiKeyToken(token) } }),
    );
  });

  it.each([
    ["a missing header", null, undefined],
    ["an unknown key", header, null],
    ["a deleted key", header, key({ deletedAt: NOW })],
    ["a revoked key", header, key({ revokedAt: NOW })],
    ["an expired key", header, key({ expiresAt: NOW })],
    ["a key without a target", header, key({ serverId: null, server: null })],
    ["a key with two targets", header, key({ groupId: "group-1" })],
    [
      "a deleted server",
      header,
      key({ server: { ...serverA, deletedAt: NOW } }),
    ],
    [
      "a deleted group",
      header,
      groupKey({
        group: { id: "group-1", name: "", deletedAt: NOW, groupServers: [] },
      }),
    ],
  ])("rejects %s", async (_, auth, row) => {
    if (row !== undefined) mocks.findKey.mockResolvedValue(row);
    await expect(authenticateApiKey(auth, NOW)).rejects.toMatchObject({
      name: "InvalidApiKey",
    });
  });

  it("rejects a key without a target even for a panel admin", async () => {
    mocks.findUser.mockResolvedValue(creator({ admin: true }));
    mocks.findKey.mockResolvedValue(key({ serverId: null, server: null }));
    await expect(authenticateApiKey(header, NOW)).rejects.toMatchObject({
      name: "InvalidApiKey",
    });
  });

  it("accepts a key that has not expired yet", async () => {
    mocks.findKey.mockResolvedValue(
      key({ expiresAt: new Date(NOW.getTime() + 1000) }),
    );
    await expect(authenticateApiKey(header, NOW)).resolves.toBeTruthy();
  });

  it("confines a server key to its server", async () => {
    const { actor, servers, scopes, target } = await authenticateApiKey(
      header,
      NOW,
    );

    expect(target).toEqual({ type: "server", serverId: serverA.id });
    expect(servers).toEqual([serverA]);
    expect(scopes).toEqual(["maps:read", "jukebox:write"]);
    expect(actor).toMatchObject({
      userId: "user-1",
      login: "creator",
      apiKeyId: "key-1",
    });
    expect(actorHasPermission(actor, moderator, serverA.id)).toBe(true);
    expect(actorHasPermission(actor, admin, serverA.id)).toBe(true);
    expect(actorHasPermission(actor, moderator, serverB.id)).toBe(false);
  });

  it("does not pass on the creator's other roles", async () => {
    mocks.findUser.mockResolvedValue(
      creator({
        permissions: ["users:edit"],
        userServers: [
          { role: "Admin", server: serverA },
          { role: "Admin", server: serverC },
        ],
      }),
    );

    const { actor } = await authenticateApiKey(header, NOW);

    expect(actor.claims.admin).toBe(false);
    expect(actorHasPermission(actor, ["users:edit"])).toBe(false);
    expect(actorHasPermission(actor, moderator, serverC.id)).toBe(false);
  });

  it("gives a group key every server currently in the group", async () => {
    mocks.findUser.mockResolvedValue(groupMember("Admin"));
    mocks.findKey.mockResolvedValue(groupKey());

    const { actor, servers, target } = await authenticateApiKey(header, NOW);

    expect(target).toEqual({ type: "group", groupId: "group-1" });
    expect(servers.map((s) => s.id)).toEqual([serverA.id, serverB.id]);
    expect(actorHasPermission(actor, moderator, serverA.id)).toBe(true);
    expect(actorHasPermission(actor, moderator, serverB.id)).toBe(true);
    expect(actorHasPermission(actor, moderator, serverC.id)).toBe(false);
  });

  it("follows servers added to or removed from the group", async () => {
    mocks.findUser.mockResolvedValue(groupMember("Admin"));
    mocks.findKey.mockResolvedValue(
      groupKey({
        group: {
          id: "group-1",
          name: "League",
          deletedAt: null,
          groupServers: [{ server: serverB }, { server: serverC }],
        },
      }),
    );

    const { actor } = await authenticateApiKey(header, NOW);

    expect(actorHasPermission(actor, moderator, serverA.id)).toBe(false);
    expect(actorHasPermission(actor, moderator, serverC.id)).toBe(true);
  });

  it("keeps a panel admin's group key inside the group", async () => {
    mocks.findUser.mockResolvedValue(creator({ admin: true }));
    mocks.findKey.mockResolvedValue(groupKey());

    const { actor } = await authenticateApiKey(header, NOW);

    expect(actor.claims.admin).toBe(false);
    expect(actorHasPermission(actor, moderator, serverA.id)).toBe(true);
    expect(actorHasPermission(actor, moderator, serverC.id)).toBe(false);
  });

  it.each([
    ["was demoted to moderator", () => groupMember("Moderator")],
    ["left the group", () => creator()],
  ])("rejects a group key whose creator %s", async (_, user) => {
    mocks.findUser.mockResolvedValue(user());
    mocks.findKey.mockResolvedValue(groupKey());
    await expect(authenticateApiKey(header, NOW)).rejects.toMatchObject({
      name: "InvalidApiKey",
    });
  });

  it.each([
    [
      "was demoted to moderator",
      () => creator({ userServers: [{ role: "Moderator", server: serverA }] }),
    ],
    ["was deleted", () => null],
  ])("rejects a server key whose creator %s", async (_, user) => {
    mocks.findUser.mockResolvedValue(user());
    await expect(authenticateApiKey(header, NOW)).rejects.toMatchObject({
      name: "InvalidApiKey",
    });
  });

  it("accepts a server key from a group admin of that server", async () => {
    mocks.findUser.mockResolvedValue(groupMember("Admin"));
    await expect(authenticateApiKey(header, NOW)).resolves.toBeTruthy();
  });

  it("writes lastUsedAt at most once a minute", async () => {
    mocks.findKey.mockResolvedValue(
      key({ lastUsedAt: new Date(NOW.getTime() - 30_000) }),
    );
    await authenticateApiKey(header, NOW);
    expect(mocks.updateKey).not.toHaveBeenCalled();

    mocks.findKey.mockResolvedValue(
      key({ lastUsedAt: new Date(NOW.getTime() - 61_000) }),
    );
    await authenticateApiKey(header, NOW);
    expect(mocks.updateKey).toHaveBeenCalledWith({
      where: { id: "key-1" },
      data: { lastUsedAt: NOW },
    });
  });

  it("still authenticates when lastUsedAt cannot be written", async () => {
    mocks.updateKey.mockRejectedValue(new Error("db down"));
    await expect(authenticateApiKey(header, NOW)).resolves.toBeTruthy();
  });

  it("drops unknown stored scopes", async () => {
    mocks.findKey.mockResolvedValue(key({ scopes: ["maps:read", "root"] }));
    const { scopes } = await authenticateApiKey(header, NOW);
    expect(scopes).toEqual(["maps:read"]);
  });
});

describe("audit entries", () => {
  it("record the API key a request runs under", () => {
    expect(
      auditLogData("user-1", "server-a", "server.kick"),
    ).not.toHaveProperty("apiKeyId");
    const data = runWithApiKey("key-1", () =>
      auditLogData("user-1", "server-a", "server.kick"),
    );
    expect(data).toMatchObject({ userId: "user-1", apiKeyId: "key-1" });
  });
});
