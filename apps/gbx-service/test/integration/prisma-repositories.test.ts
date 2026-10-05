import { createPrismaClient, type DbClient } from "@tmcp/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createPluginPackage, readPluginPackage } from "@tmcp/shared/plugin-package";
import {
  PrismaFirstPartyRepository,
  PrismaMapRepository,
  PrismaMatchRepository,
  PrismaNotificationRepository,
  PrismaPlayerRepository,
  PrismaPluginCatalogRepository,
  PrismaPluginPackageRepository,
  PrismaPluginStorageRepository,
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
    await db.pluginStorage.deleteMany();
    await db.serverPlugins.deleteMany();
    await db.pluginVersions.deleteMany();
    // Includes the rows the migrations seed; tests create the ones they need
    await db.plugins.deleteMany();
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

  const installPackage = async (serverId: string, version = "1.0.0", enabled = true) => {
    const plugin = await db.plugins.upsert({
      where: { name: "hello" },
      update: {},
      create: { name: "hello", source: "marketplace" },
    });
    const row = await db.pluginVersions.upsert({
      where: { pluginId_version: { pluginId: plugin.id, version } },
      update: {},
      create: {
        pluginId: plugin.id,
        version,
        sdk: 1,
        sha256: "a".repeat(64),
        size: 3,
        manifest: { slug: "hello" },
        package: Buffer.from([1, 2, 3]),
      },
    });
    await db.serverPlugins.upsert({
      where: { serverId_pluginId: { serverId, pluginId: plugin.id } },
      create: {
        serverId,
        pluginId: plugin.id,
        enabled,
        versionId: row.id,
        grantedCapabilities: ["ui", "storage"],
      },
      update: { versionId: row.id, enabled },
    });
    return { plugin, version: row };
  };

  it("loads installed packages with their granted capabilities", async () => {
    await createServer("s1");
    const { plugin, version } = await installPackage("s1");

    const repo = new PrismaServerRepository(db);
    expect(await repo.findPlugins("s1")).toEqual([
      {
        pluginId: plugin.id,
        name: "hello",
        enabled: true,
        config: null,
        package: {
          versionId: version.id,
          version: "1.0.0",
          sha256: "a".repeat(64),
          source: "marketplace",
          grantedCapabilities: ["ui", "storage"],
          yanked: false,
        },
      },
    ]);
    expect(await new PrismaPluginPackageRepository(db).loadPackage(version.id)).toEqual(
      new Uint8Array([1, 2, 3]),
    );

    await repo.setPluginEnabled("s1", plugin.id, false);
    expect((await repo.findPlugins("s1"))[0].enabled).toBe(false);
  });

  it("keeps plugin storage per server and plugin", async () => {
    await createServer("s1");
    await createServer("s2");
    const { plugin } = await installPackage("s1");
    const storage = new PrismaPluginStorageRepository(db);

    await storage.set("s1", plugin.id, "a:1", { n: 1 }, 7);
    await storage.set("s1", plugin.id, "a:2", [1, 2], 5);
    await storage.set("s1", plugin.id, "b", "x", 3);
    await storage.set("s2", plugin.id, "a:1", 1, 1);
    await storage.set("s1", plugin.id, "a:1", { n: 2 }, 7);

    expect(await storage.get("s1", plugin.id, "a:1")).toEqual({ n: 2 });
    expect(await storage.get("s1", plugin.id, "missing")).toBeNull();
    expect(await storage.keys("s1", plugin.id, "a:", 10)).toEqual(["a:1", "a:2"]);
    expect(await storage.usage("s1", plugin.id)).toEqual({ keys: 3, bytes: 15 });
    expect(await storage.sizeOf("s1", plugin.id, "a:2")).toBe(5);

    await storage.delete("s1", plugin.id, "a:2");
    expect(await storage.usage("s1", plugin.id)).toEqual({ keys: 2, bytes: 10 });
    expect(await storage.usage("s2", plugin.id)).toEqual({ keys: 1, bytes: 1 });
  });

  it("marks yanked versions and turns off only the servers running them", async () => {
    await createServer("s1");
    await createServer("s2");
    await createServer("s3");
    const { plugin } = await installPackage("s1");
    await installPackage("s2", "1.0.0", false);

    const catalog = new PrismaPluginCatalogRepository(db);
    const affected = await catalog.applyYanks([
      { slug: "hello", version: "1.0.0", reason: "Steals API keys" },
      { slug: "unknown", version: "9.9.9", reason: null },
    ]);
    expect(affected).toEqual([
      { serverId: "s1", pluginId: plugin.id, name: "hello", version: "1.0.0", reason: "Steals API keys" },
    ]);
    const version = await db.pluginVersions.findFirstOrThrow({ where: { pluginId: plugin.id } });
    expect([version.yanked, version.yankReason]).toEqual([true, "Steals API keys"]);
    expect((await db.serverPlugins.findMany({ where: { pluginId: plugin.id } })).map((sp) => sp.enabled)).toEqual([
      false,
      false,
    ]);

    // A second check finds nothing left to turn off
    expect(await catalog.applyYanks([{ slug: "hello", version: "1.0.0", reason: "Steals API keys" }])).toEqual([]);
  });

  it("moves built-in installs onto the first-party package and keeps their settings", async () => {
    await createServer("configured");
    await createServer("untouched");
    await createServer("enabled");
    const legacy = await db.plugins.create({
      data: { name: "map-info", description: "Old description", source: "builtin" },
    });
    await db.serverPlugins.createMany({
      data: [
        { serverId: "configured", pluginId: legacy.id, enabled: false, config: { a: 1 } },
        { serverId: "untouched", pluginId: legacy.id, enabled: false },
        { serverId: "enabled", pluginId: legacy.id, enabled: true },
      ],
    });

    const bytes = createPluginPackage({
      "tmcp-plugin.json": JSON.stringify({
        slug: "map-info",
        name: "Map info",
        version: "1.0.0",
        sdk: 1,
        description: "Shows the current map.",
        author: "TMControlPanel",
        capabilities: ["ui", "maps:read"],
      }),
      "index.js": "globalThis.__tmcpRegister({ create() { return {}; } });",
    });
    const pkg = readPluginPackage(bytes);
    const repo = new PrismaFirstPartyRepository(db);

    expect(await repo.install(pkg.manifest, pkg.sha256, bytes)).toEqual({
      slug: "map-info",
      version: "1.0.0",
      stored: true,
      migrated: 2,
      removed: 1,
    });

    const plugin = await db.plugins.findUniqueOrThrow({ where: { name: "map-info" } });
    expect(plugin).toMatchObject({ id: legacy.id, source: "marketplace", displayName: "Map info" });
    const rows = await db.serverPlugins.findMany({ orderBy: { serverId: "asc" } });
    expect(rows.map((r) => [r.serverId, r.enabled, r.config, r.grantedCapabilities])).toEqual([
      ["configured", false, { a: 1 }, ["ui", "maps:read"]],
      ["enabled", true, null, ["ui", "maps:read"]],
    ]);
    expect(rows.every((r) => r.versionId !== null)).toBe(true);

    // Every start runs it again; nothing changes the second time
    expect(await repo.install(pkg.manifest, pkg.sha256, bytes)).toMatchObject({
      stored: false,
      migrated: 0,
      removed: 0,
    });
    expect(await db.pluginVersions.count()).toBe(1);
  });

  it("leaves an uploaded plugin with a first-party name alone", async () => {
    await db.plugins.create({ data: { name: "ecm", source: "upload" } });
    const bytes = createPluginPackage({
      "tmcp-plugin.json": JSON.stringify({
        slug: "ecm",
        name: "eCircuitMania",
        version: "1.0.0",
        sdk: 1,
        description: "x",
        author: "x",
        capabilities: [],
      }),
      "index.js": "globalThis.__tmcpRegister({ create() { return {}; } });",
    });
    const pkg = readPluginPackage(bytes);
    const result = await new PrismaFirstPartyRepository(db).install(pkg.manifest, pkg.sha256, bytes);
    expect(result.skipped).toMatch(/uploaded/);
    expect(await db.pluginVersions.count()).toBe(0);
  });
});
