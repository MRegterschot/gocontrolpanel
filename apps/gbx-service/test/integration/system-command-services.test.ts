import { createPrismaClient, type DbClient } from "@gcp/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaSystemCommandServices } from "../../src/infra/db/system-command-services";

const url = process.env.INTEGRATION_DATABASE_URL;
describe.skipIf(!url)("system command admin access", () => {
  let db: DbClient;
  let services: PrismaSystemCommandServices;
  beforeAll(async () => {
    db = createPrismaClient({ datasourceUrl: url });
    services = new PrismaSystemCommandServices(db, {
      status: "ready",
      ping: async () => "PONG",
    });
    await db.servers.createMany({
      data: ["system-test", "system-other"].map((id) => ({
        id,
        name: id,
        description: "",
        host: "127.0.0.1",
        port: 5000,
        user: "test",
        password: "test",
      })),
    });
    await db.users.createMany({
      data: ["global", "direct", "group", "moderator", "other", "member"].map(
        (role) => ({
          id: `system-${role}`,
          login: `system-${role}`,
          nickName: role,
          path: "",
          admin: role === "global",
        }),
      ),
    });
    await db.userServers.createMany({
      data: [
        { userId: "system-direct", serverId: "system-test", role: "Admin" },
        {
          userId: "system-moderator",
          serverId: "system-test",
          role: "Moderator",
        },
        { userId: "system-other", serverId: "system-other", role: "Admin" },
      ],
    });
    await db.groups.create({
      data: {
        id: "system-group",
        name: "system group",
        description: "",
        groupServers: { create: { serverId: "system-test" } },
        groupMembers: { create: { userId: "system-group", role: "Admin" } },
      },
    });
  });
  afterAll(async () => {
    await db.groupServers.deleteMany({ where: { groupId: "system-group" } });
    await db.groupMember.deleteMany({ where: { groupId: "system-group" } });
    await db.groups.deleteMany({ where: { id: "system-group" } });
    await db.userServers.deleteMany({
      where: { serverId: { in: ["system-test", "system-other"] } },
    });
    await db.users.deleteMany({ where: { id: { startsWith: "system-" } } });
    await db.servers.deleteMany({
      where: { id: { in: ["system-test", "system-other"] } },
    });
    await db.$disconnect();
  });
  it.each(["global", "direct", "group"])("allows %s admins", async (role) => {
    expect(await services.isAdmin("system-test", `system-${role}`)).toBe(true);
  });
  it.each(["moderator", "other", "member", "unknown"])(
    "denies %s users",
    async (role) => {
      expect(await services.isAdmin("system-test", `system-${role}`)).toBe(
        false,
      );
    },
  );
  it("does not grant access through deleted groups", async () => {
    await db.groups.update({
      where: { id: "system-group" },
      data: { deletedAt: new Date() },
    });
    expect(await services.isAdmin("system-test", "system-group")).toBe(false);
  });
  it("applies permission revocation immediately", async () => {
    await db.userServers.delete({
      where: {
        userId_serverId: { userId: "system-direct", serverId: "system-test" },
      },
    });
    expect(await services.isAdmin("system-test", "system-direct")).toBe(false);
  });
  it("probes the real database", async () => {
    await expect(services.checkDatabase()).resolves.toBeUndefined();
  });
});
