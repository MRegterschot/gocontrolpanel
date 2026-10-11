import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: { user: {} as Record<string, unknown> },
  servers: {
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  groups: { update: vi.fn() },
  groupServers: { findMany: vi.fn() },
  users: { findUnique: vi.fn(), update: vi.fn() },
  hetznerProjects: { update: vi.fn() },
  matches: { updateMany: vi.fn() },
  records: { updateMany: vi.fn() },
  auditLogs: { create: vi.fn() },
  audit: vi.fn(),
  saveChatConfig: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/actions", () => ({
  doServerActionWithAuth: async (
    _roles: string[],
    action: (session: unknown) => Promise<unknown>,
  ) => {
    try {
      return { data: await action(mocks.session) };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },
}));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => {
    const client = {
      servers: mocks.servers,
      groups: mocks.groups,
      groupServers: mocks.groupServers,
      users: mocks.users,
      hetznerProjects: mocks.hetznerProjects,
      matches: mocks.matches,
      records: mocks.records,
      auditLogs: mocks.auditLogs,
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(client),
    };
    return client;
  },
}));
vi.mock("@/actions/database/server-only/audit-logs", () => ({
  logAudit: mocks.audit,
  auditLogData: (...args: unknown[]) => ({ args }),
  withAudit: async (
    write: (tx: unknown) => Promise<unknown>,
    audit: (result: unknown) => unknown[],
  ) => {
    const result = await write(mocks);
    mocks.audit(...audit(result));
    return result;
  },
}));
vi.mock("@/actions/database/server-only/themes", () => ({
  groupServerIds: async () => [],
  publishThemeChange: vi.fn(),
}));
vi.mock("@/lib/gbx-service", () => ({
  publishServerEvent: vi.fn(),
  gbxService: { applyChatConfig: vi.fn() },
}));
vi.mock("@/lib/chat-config", () => ({ saveChatConfig: mocks.saveChatConfig }));
vi.mock("@/lib/redis", () => ({}));
vi.mock("@/lib/logger", () => ({
  getLogger: () => ({ error: vi.fn(), warn: vi.fn() }),
  logger: { error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/hetzner", () => ({
  encryptHetznerToken: (token: string) => `enc:${token}`,
  decryptHetznerToken: (token: string) => token,
}));

import { updateGroup } from "@/actions/database/groups";
import { updateHetznerProject } from "@/actions/database/hetzner-projects";
import { deleteMatch } from "@/actions/database/matches";
import { adminAuditScope } from "@/actions/database/server-only/audit-scope";
import {
  updateServer,
  updateServerChatConfig,
} from "@/actions/database/servers";
import { updateUser } from "@/actions/database/users";

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: "me",
    admin: false,
    permissions: [],
    servers: [],
    groups: [],
    projects: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.user = user();
  mocks.servers.findFirst.mockResolvedValue({
    filemanagerUrl: "http://10.0.0.5:3300",
    filemanagerPassword: "fm-secret",
  });
  mocks.servers.update.mockResolvedValue({ id: "s1" });
  mocks.groups.update.mockResolvedValue({ theme: null, groupServers: [] });
  mocks.hetznerProjects.update.mockResolvedValue({ apiTokens: [] });
});

describe("server actions", () => {
  it("rejects nested relation writes before they reach Prisma", async () => {
    const res = await updateServer("s1", {
      name: "x",
      records: { update: { data: { user: { update: { admin: true } } } } },
    } as never);
    expect(res.error).toBeDefined();
    expect(mocks.servers.update).not.toHaveBeenCalled();
  });

  it("leaves memberships alone on a partial update", async () => {
    await updateServer("s1", { name: "Renamed" });
    const data = mocks.servers.update.mock.calls[0][0].data;
    expect(data.name).toBe("Renamed");
    expect(data).not.toHaveProperty("userServers");
  });

  it("never sends the stored file manager token to a new origin", async () => {
    const res = await updateServer("s1", {
      filemanagerUrl: "https://attacker.test",
    });
    expect(res.error).toMatch(/password/i);
    expect(mocks.servers.update).not.toHaveBeenCalled();

    await updateServer("s1", {
      filemanagerUrl: "https://attacker.test",
      filemanagerPassword: "new-secret",
    });
    expect(mocks.servers.update).toHaveBeenCalled();
  });

  it("only accepts chat fields in the chat config", async () => {
    const res = await updateServerChatConfig("s1", {
      manualRouting: false,
      messageFormat: null,
      connectMessage: null,
      disconnectMessage: null,
      scriptNameChangeMessage: null,
      matchSettingsLoadedMessage: null,
      scriptSettingsSavedMessage: null,
      mapListChangeMessage: null,
      host: "attacker.test",
    } as never);
    expect(res.error).toBeDefined();
    expect(mocks.saveChatConfig).not.toHaveBeenCalled();
  });
});

describe("group actions", () => {
  it("refuses to link a server the group admin doesn't administer", async () => {
    mocks.session.user = user({
      groups: [{ id: "g1", role: "Admin", servers: [] }],
    });
    mocks.groupServers.findMany.mockResolvedValue([]);
    const res = await updateGroup("g1", {
      groupServers: [{ serverId: "foreign" }],
    } as never);
    expect(res.error).toMatch(/servers you administer/);
    expect(mocks.groups.update).not.toHaveBeenCalled();
  });

  it("links servers the caller administers and keeps omitted members", async () => {
    mocks.session.user = user({
      servers: [{ id: "mine", name: "Mine", role: "Admin" }],
      groups: [{ id: "g1", role: "Admin", servers: [] }],
    });
    mocks.groupServers.findMany.mockResolvedValue([]);
    await updateGroup("g1", { groupServers: [{ serverId: "mine" }] } as never);
    const data = mocks.groups.update.mock.calls[0][0].data;
    expect(data.groupServers.create).toEqual([{ serverId: "mine" }]);
    expect(data).not.toHaveProperty("groupMembers");
  });
});

describe("user actions", () => {
  beforeEach(() => {
    mocks.session.user = user({ permissions: ["users:edit"] });
    mocks.users.findUnique.mockResolvedValue({ admin: false, permissions: [] });
  });

  it("doesn't let a delegated user manager grant admin", async () => {
    const res = await updateUser("other", { admin: true, permissions: [] });
    expect(res.error).toBeDefined();
    expect(mocks.users.update).not.toHaveBeenCalled();
  });

  it("doesn't let them grant permissions they lack, or edit themselves", async () => {
    expect(
      (await updateUser("other", { admin: false, permissions: ["roles:edit"] }))
        .error,
    ).toBeDefined();
    expect(
      (await updateUser("me", { admin: false, permissions: [] })).error,
    ).toBeDefined();
    expect(mocks.users.update).not.toHaveBeenCalled();
  });

  it("allows granting permissions they hold", async () => {
    await updateUser("other", { admin: false, permissions: ["users:edit"] });
    expect(mocks.users.update).toHaveBeenCalledWith({
      where: { id: "other" },
      data: { admin: false, permissions: ["users:edit"] },
    });
  });
});

describe("hetzner projects", () => {
  it("keeps tokens when omitted and keeps them out of the audit log", async () => {
    await updateHetznerProject("p1", { name: "Renamed" } as never);
    expect(mocks.hetznerProjects.update.mock.calls[0][0].data).toEqual({
      name: "Renamed",
    });

    await updateHetznerProject("p1", { apiTokens: ["tok-123"] } as never);
    const details = mocks.audit.mock.calls.at(-1)![3];
    expect(JSON.stringify(details)).not.toContain("tok-123");
  });
});

describe("match deletion", () => {
  it("writes nothing for a match of another server", async () => {
    mocks.matches.updateMany.mockResolvedValue({ count: 0 });
    const res = await deleteMatch("s1", "foreign-match");
    expect(res.error).toBe("Match not found");
    expect(mocks.matches.updateMany.mock.calls[0][0].where).toMatchObject({
      id: "foreign-match",
      serverId: "s1",
    });
    expect(mocks.records.updateMany).not.toHaveBeenCalled();
    expect(mocks.auditLogs.create).not.toHaveBeenCalled();
  });
});

describe("audit log scope", () => {
  it("only covers targets the user administers", () => {
    const scope = adminAuditScope({
      user: user({
        servers: [
          { id: "admin-server", role: "Admin" },
          { id: "member-server", role: "Member" },
        ],
        groups: [
          { id: "public", role: "Member", servers: [{ id: "public-server" }] },
          {
            id: "admin-group",
            role: "Admin",
            servers: [{ id: "group-server" }],
          },
        ],
        projects: [{ id: "mod-project", role: "Moderator" }],
      }),
    } as never);
    expect(scope).toEqual({
      OR: [
        {
          targetType: "server",
          targetId: { in: ["admin-server", "group-server"] },
        },
        { targetType: "group", targetId: { in: ["admin-group"] } },
      ],
    });
    expect(adminAuditScope({ user: user() } as never)).toBeNull();
  });
});
