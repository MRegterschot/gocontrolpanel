import { createPrismaClient, type DbClient } from "@gcp/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  PrismaMapRepository,
  PrismaMatchRepository,
  PrismaNotificationRepository,
  PrismaPlayerRepository,
  PrismaRecordRepository,
  PrismaServerRepository,
} from "../../src/infra/db/prisma-repositories";

const url = process.env.INTEGRATION_DATABASE_URL;

// Runs against a migrated database: DB=postgres DATABASE_URL=$INTEGRATION_DATABASE_URL bun run deploy
describe.skipIf(!url)("Prisma repositories", () => {
  let db: DbClient;

  beforeAll(() => {
    db = createPrismaClient({ datasourceUrl: url });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  beforeEach(async () => {
    await db.records.deleteMany();
    await db.matches.deleteMany();
    await db.notifications.deleteMany();
    await db.groupServers.deleteMany();
    await db.groupMember.deleteMany();
    await db.groups.deleteMany();
    await db.userServers.deleteMany();
    await db.serverPlugins.deleteMany();
    await db.servers.deleteMany();
    await db.maps.deleteMany();
    await db.users.deleteMany();
  });

  const createServer = (id: string, deletedAt: Date | null = null) =>
    db.servers.create({
      data: {
        id,
        name: `Server ${id}`,
        description: "",
        host: "127.0.0.1",
        port: 5000,
        user: "SuperAdmin",
        password: "pw",
        messageFormat: "<{nickName}> {message}",
        deletedAt,
      },
    });

  const createMap = (uid: string) =>
    new PrismaMapRepository(db).create(
      {
        uid,
        name: uid,
        fileName: `${uid}.Map.Gbx`,
        author: "a",
        authorNickname: "A",
        authorTime: 1,
        goldTime: 2,
        silverTime: 3,
        bronzeTime: 4,
      },
      null,
    );

  it("loads servers with chat config and plugins", async () => {
    await createServer("s1");
    await createServer("gone", new Date());
    const plugin = await db.plugins.upsert({
      where: { name: "map-info" },
      update: {},
      create: { name: "map-info" },
    });
    await db.serverPlugins.create({
      data: { serverId: "s1", pluginId: plugin.id, enabled: true, config: { a: 1 } },
    });

    const repo = new PrismaServerRepository(db);
    expect(await repo.listActiveIds()).toEqual(["s1"]);
    expect(await repo.findById("gone")).toBeNull();

    const server = await repo.findById("s1");
    expect(server).toMatchObject({
      id: "s1",
      chat: { manualRouting: false, messageFormat: "<{nickName}> {message}" },
      plugins: [{ pluginId: plugin.id, name: "map-info", enabled: true, config: { a: 1 } }],
    });

    await repo.updatePluginConfig("s1", plugin.id, { a: 2 });
    expect((await repo.findPlugins("s1"))[0].config).toEqual({ a: 2 });
  });

  it("creates and renames players without overwriting placeholders", async () => {
    const repo = new PrismaPlayerRepository(db);
    await repo.upsertMany([
      { login: "a", nickName: "A", playerId: 1, spectatorStatus: 0, teamId: 0 },
      { login: "b", nickName: "B", playerId: 2, spectatorStatus: 0, teamId: 0 },
    ]);
    await repo.upsertMany([{ login: "a", nickName: "A2", playerId: 1, spectatorStatus: 0, teamId: 0 }]);
    await repo.ensureExists("b", "ignored");
    await repo.ensureExists("c", "C");

    const users = await db.users.findMany({ orderBy: { login: "asc" } });
    expect(users.map((u) => [u.login, u.nickName])).toEqual([["a", "A2"], ["b", "B"], ["c", "C"]]);
  });

  it("stores maps and their metadata", async () => {
    const repo = new PrismaMapRepository(db);
    const map = await createMap("uid-1");
    expect(map.thumbnailUrl).toBeNull();
    expect(map.uploadCheck).toBeInstanceOf(Date);

    const updated = await repo.updateMetadata(map.id, {
      submitter: "s",
      timestamp: new Date("2024-01-01"),
      fileUrl: "https://f/uid-1",
      thumbnailUrl: "https://t/uid-1",
    });
    expect(updated.thumbnailUrl).toBe("https://t/uid-1");
    expect((await repo.findByFileNames(["uid-1.Map.Gbx"])).map((m) => m.uid)).toEqual(["uid-1"]);
    expect(await repo.findByUid("nope")).toBeNull();
  });

  it("upserts records per match, login and round", async () => {
    await createServer("s1");
    const map = await createMap("uid-1");
    await new PrismaPlayerRepository(db).ensureExists("a", "A");
    const match = await new PrismaMatchRepository(db).create({ serverId: "s1", mapId: map.id, mode: "rounds" });
    const records = new PrismaRecordRepository(db);
    const base = { serverId: "s1", matchId: match.id, round: 1, mapId: map.id, mapUid: map.uid, login: "a" };

    await records.save({ ...base, time: 5000, checkpoints: [1000, 5000] });
    await records.save({ ...base, time: 4000, checkpoints: [900, 4000], points: 10 });
    await records.save({ ...base, matchId: null, round: null, time: 3000, checkpoints: [3000] });

    const rows = await db.records.findMany({ orderBy: { time: "asc" } });
    expect(rows.map((r) => [r.time, r.round, r.points])).toEqual([
      [3000, null, null],
      [4000, 1, 10],
    ]);
  });

  it("finds local records across servers sharing records", async () => {
    await createServer("s1");
    await createServer("s2");
    await createServer("s3");
    await db.groups.create({
      data: {
        name: "shared",
        description: "",
        shareRecords: true,
        groupServers: { create: [{ serverId: "s1" }, { serverId: "s2" }] },
      },
    });
    const map = await createMap("uid-1");
    const players = new PrismaPlayerRepository(db);
    for (const login of ["a", "b"]) await players.ensureExists(login, login.toUpperCase());

    const records = new PrismaRecordRepository(db);
    const save = (serverId: string, login: string, time: number) =>
      records.save({ serverId, matchId: null, round: null, mapId: map.id, mapUid: map.uid, login, time, checkpoints: [] });
    await save("s1", "a", 5000);
    await save("s2", "b", 4000);
    await save("s3", "b", 1000);
    await save("s1", "a", 4500);

    expect(await records.findLocalRecord("s1", "uid-1")).toEqual({ login: "b", time: 4000, nickName: "B" });
    expect(await records.findLocalRecord("s3", "uid-1")).toMatchObject({ time: 1000 });

    const perPlayer = await records.findPlayerRecords("s1", "uid-1", ["a", "b"]);
    expect(perPlayer.map((r) => [r.login, r.time]).sort()).toEqual([["a", 4500], ["b", 4000]]);

    // A server outside any sharing group still sees its own records
    expect(await records.findPlayerRecords("s3", "uid-1", ["b"])).toEqual([
      { login: "b", time: 1000, nickName: "B" },
    ]);
  });

  it("notifies direct and group admins once each", async () => {
    await createServer("s1");
    const users = await Promise.all(
      ["direct", "group", "both", "member"].map((login) =>
        db.users.create({ data: { login, nickName: login, path: "" } }),
      ),
    );
    const [direct, group, both, member] = users;
    await db.userServers.createMany({
      data: [
        { userId: direct.id, serverId: "s1", role: "Admin" },
        { userId: both.id, serverId: "s1", role: "Admin" },
        { userId: member.id, serverId: "s1", role: "Member" },
      ],
    });
    await db.groups.create({
      data: {
        name: "admins",
        description: "",
        groupServers: { create: [{ serverId: "s1" }] },
        groupMembers: {
          create: [
            { userId: group.id, role: "Admin" },
            { userId: both.id, role: "Admin" },
          ],
        },
      },
    });

    const created = await new PrismaNotificationRepository(db).createForServerAdmins({
      serverId: "s1",
      type: "adminCommand",
      message: "help",
    });

    expect(created.map((n) => n.userId).sort()).toEqual([both.id, direct.id, group.id].sort());
    expect(created[0]).toMatchObject({ serverId: "s1", read: false, description: null });
    expect(typeof created[0].timestamp).toBe("string");
  });
});
