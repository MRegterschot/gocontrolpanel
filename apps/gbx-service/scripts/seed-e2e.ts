// Creates the e2e server row, an admin user and plugin rows in the e2e database
import { createPrismaClient } from "@gcp/db";

const env = process.env;
const serverId = env.E2E_SERVER_ID ?? "e2e-server";
const adminLogin = env.E2E_ADMIN_LOGIN?.trim();
const plugins = (env.E2E_PLUGINS ?? "all").split(",").map((p) => p.trim());

const db = createPrismaClient({ datasourceUrl: env.DATABASE_URL });

async function main() {
  await db.servers.upsert({
    where: { id: serverId },
    update: {
      host: env.E2E_GBX_HOST ?? "127.0.0.1",
      port: Number(env.E2E_GBX_PORT ?? 5010),
      password: env.E2E_GBX_PASSWORD ?? "SuperAdmin",
      deletedAt: null,
    },
    create: {
      id: serverId,
      name: "GCP e2e",
      description: "Real server test target",
      host: env.E2E_GBX_HOST ?? "127.0.0.1",
      port: Number(env.E2E_GBX_PORT ?? 5010),
      user: "SuperAdmin",
      password: env.E2E_GBX_PASSWORD ?? "SuperAdmin",
    },
  });

  let adminId: string | null = null;
  if (adminLogin) {
    const user = await db.users.upsert({
      where: { login: adminLogin },
      update: {},
      create: { login: adminLogin, nickName: adminLogin, path: "" },
    });
    adminId = user.id;
    await db.userServers.upsert({
      where: { userId_serverId: { userId: user.id, serverId } },
      update: { role: "Admin" },
      create: { userId: user.id, serverId, role: "Admin" },
    });

    // The web app's server switcher (/ws/servers) only lists servers reached through a group
    const groupId = `${serverId}-group`;
    await db.groups.upsert({
      where: { id: groupId },
      update: { deletedAt: null },
      create: { id: groupId, name: "GCP e2e", description: "Real server test group" },
    });
    await db.groupServers.upsert({
      where: { groupId_serverId: { groupId, serverId } },
      update: {},
      create: { groupId, serverId },
    });
    await db.groupMember.upsert({
      where: { userId_groupId: { userId: user.id, groupId } },
      update: { role: "Admin" },
      create: { userId: user.id, groupId, role: "Admin" },
    });
  }

  const rows = await db.plugins.findMany();
  for (const plugin of rows) {
    const enabled = plugins.includes("all") || plugins.includes(plugin.name);
    const config =
      plugin.name === "match" && adminLogin
        ? { admins: [adminLogin] }
        : plugin.name === "ecm" && adminLogin
          ? { editors: [adminLogin] }
          : {};
    await db.serverPlugins.upsert({
      where: { serverId_pluginId: { serverId, pluginId: plugin.id } },
      update: { enabled },
      create: { serverId, pluginId: plugin.id, enabled, config },
    });
  }

  console.log(`Server: ${serverId}`);
  console.log(`Plugins enabled: ${rows.filter((p) => plugins.includes("all") || plugins.includes(p.name)).map((p) => p.name).join(", ")}`);
  if (adminId) console.log(`Admin user id (for --user): ${adminId}`);
  else console.log("No E2E_ADMIN_LOGIN set: notifications and admin-only commands can't be tested");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
