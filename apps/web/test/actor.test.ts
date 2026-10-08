import { serverPermissions } from "@gcp/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUser: vi.fn(),
  findGroups: vi.fn(),
  rpush: vi.fn(),
  del: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => ({
    users: { findUnique: mocks.findUser },
    groups: { findMany: mocks.findGroups },
  }),
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/sentry/report", () => ({ reportException: vi.fn() }));
vi.mock("@/lib/redis", () => ({
  getKeyJukebox: (id: string) => `jukebox:${id}`,
  getRedisClient: async () => ({ rpush: mocks.rpush, del: mocks.del }),
}));
vi.mock("@/actions/database/server-only/audit-logs", () => ({
  logAudit: mocks.audit,
}));

import { addMapToJukeboxAs } from "@/actions/gbx/server-only/map";
import {
  actorForLogin,
  actorFromSession,
  actorHasPermission,
  doActionAs,
  guestActor,
} from "@/lib/actor";
import type { Session } from "next-auth";

const server = { id: "server-a", name: "A" };
const other = { id: "server-b", name: "B" };
const moderator = [...serverPermissions.moderator];
const admin = [...serverPermissions.admin];

function dbUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    login: "login-1",
    nickName: "Player One",
    admin: false,
    permissions: [],
    userServers: [],
    groupMembers: [],
    hetznerProjectUsers: [],
    ...overrides,
  };
}

beforeEach(() => {
  mocks.findGroups.mockResolvedValue([]);
});

describe("actorForLogin", () => {
  it("returns a guest without roles for an unknown login", async () => {
    mocks.findUser.mockResolvedValue(null);

    const actor = await actorForLogin("nobody");

    expect(actor.userId).toBeNull();
    expect(actorHasPermission(actor, moderator, server.id)).toBe(false);
  });

  it("grants direct server roles only on that server", async () => {
    mocks.findUser.mockResolvedValue(
      dbUser({ userServers: [{ role: "Moderator", server }] }),
    );

    const actor = await actorForLogin("login-1");

    expect(actor.userId).toBe("user-1");
    expect(actor.displayName).toBe("Player One");
    expect(actorHasPermission(actor, moderator, server.id)).toBe(true);
    expect(actorHasPermission(actor, admin, server.id)).toBe(false);
    expect(actorHasPermission(actor, moderator, other.id)).toBe(false);
  });

  it("grants group roles on the group's servers", async () => {
    mocks.findUser.mockResolvedValue(
      dbUser({
        groupMembers: [
          {
            role: "Admin",
            group: { id: "g1", name: "G1", groupServers: [{ server }] },
          },
        ],
      }),
    );

    const actor = await actorForLogin("login-1");

    expect(actorHasPermission(actor, admin, server.id)).toBe(true);
    expect(actorHasPermission(actor, admin, other.id)).toBe(false);
  });

  it("adds public groups as Member without raising an existing role", async () => {
    mocks.findUser.mockResolvedValue(
      dbUser({
        groupMembers: [
          {
            role: "Admin",
            group: { id: "g1", name: "G1", groupServers: [{ server }] },
          },
        ],
      }),
    );
    mocks.findGroups.mockResolvedValue([
      { id: "g1", name: "G1", groupServers: [{ server }] },
      { id: "public", name: "Public", groupServers: [{ server: other }] },
    ]);

    const actor = await actorForLogin("login-1");

    expect(actor.claims.groups).toHaveLength(2);
    expect(actorHasPermission(actor, admin, server.id)).toBe(true);
    expect(
      actorHasPermission(actor, ["group:servers:id:member"], other.id),
    ).toBe(true);
    expect(actorHasPermission(actor, moderator, other.id)).toBe(false);
  });

  it("treats panel admins as allowed everywhere", async () => {
    mocks.findUser.mockResolvedValue(dbUser({ admin: true }));

    const actor = await actorForLogin("login-1");

    expect(actorHasPermission(actor, admin, other.id)).toBe(true);
  });
});

describe("actorHasPermission", () => {
  it("fails closed on an empty permission list", () => {
    expect(actorHasPermission(guestActor("x"), [])).toBe(false);
  });
});

describe("actorFromSession", () => {
  it("keeps the session's roles", () => {
    const session = {
      user: {
        id: "user-1",
        login: "login-1",
        displayName: "Player One",
        admin: false,
        permissions: [],
        servers: [{ ...server, role: "Admin" }],
        groups: [],
        adminGroups: [],
        projects: [],
      },
    } as unknown as Session;

    const actor = actorFromSession(session);

    expect(actor.userId).toBe("user-1");
    expect(actorHasPermission(actor, admin, server.id)).toBe(true);
  });
});

describe("doActionAs", () => {
  it("does not run the action without permission", async () => {
    const action = vi.fn();

    const result = await doActionAs(
      guestActor("x"),
      moderator,
      action,
      server.id,
    );

    expect(action).not.toHaveBeenCalled();
    expect(result.code).toBe("Unauthorized");
  });
});

describe("addMapToJukeboxAs", () => {
  const map = { uid: "map-uid", name: "Map" } as never;

  it("rejects an actor without a role on the server", async () => {
    await expect(
      addMapToJukeboxAs(guestActor("x"), server.id, map),
    ).rejects.toThrow("Unauthorized");
    expect(mocks.rpush).not.toHaveBeenCalled();
  });

  it("queues the map and audits it as the actor", async () => {
    mocks.findUser.mockResolvedValue(
      dbUser({ userServers: [{ role: "Moderator", server }] }),
    );
    const actor = await actorForLogin("login-1");

    const queued = await addMapToJukeboxAs(actor, server.id, map);

    expect(queued.QueuedBy).toBe("login-1");
    expect(queued.QueuedByDisplayName).toBe("Player One");
    expect(mocks.rpush).toHaveBeenCalledWith(
      "jukebox:server-a",
      expect.any(String),
    );
    expect(mocks.audit).toHaveBeenCalledWith(
      "user-1",
      server.id,
      "server.maps.jukebox.add",
      expect.anything(),
    );
  });
});
