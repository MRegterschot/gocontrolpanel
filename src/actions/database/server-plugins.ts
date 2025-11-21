"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { getGbxClientManager } from "@/lib/managers/gbxclient-manager";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "./server-only/audit-logs";
import { ServerPluginsWithPlugin } from "./server-only/gbx";

export async function updateServerPlugins(
  serverId: string,
  plugins: {
    pluginId: string;
    enabled: boolean;
  }[],
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async (session) => {
      const db = getClient();
      const pluginUpdates = plugins.map((p) =>
        db.serverPlugins.upsert({
          where: {
            serverId_pluginId: {
              serverId,
              pluginId: p.pluginId,
            },
          },
          create: {
            serverId,
            pluginId: p.pluginId,
            enabled: p.enabled,
          },
          update: {
            enabled: p.enabled,
          },
        }),
      );

      await db.$transaction(pluginUpdates);

      const updatedPlugins = await db.serverPlugins.findMany({
        where: { serverId },
        include: {
          plugin: true,
        },
      });

      const manager = await getGbxClientManager(serverId);

      manager.info.plugins = updatedPlugins;
      manager.pluginManager.reloadPlugins();

      await logAudit(
        session.user.id,
        serverId,
        "server.interface.plugins.edit",
        plugins,
      );
    },
  );
}

export async function updateServerPlugin(
  serverId: string,
  pluginId: string,
  config: Record<string, any>,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async (session) => {
      const db = getClient();
      await db.serverPlugins.updateMany({
        where: {
          serverId,
          pluginId,
        },
        data: {
          config,
        },
      });

      const manager = await getGbxClientManager(serverId);

      const updatedPlugins = await db.serverPlugins.findMany({
        where: { serverId },
        include: {
          plugin: true,
        },
      });

      manager.info.plugins = updatedPlugins;
      manager.pluginManager.reloadPlugins();

      await logAudit(
        session.user.id,
        serverId,
        "server.interface.plugins.config.edit",
        { pluginId, config },
      );
    },
  );
}

export async function getServerPlugins(
  serverId: string,
): Promise<ServerResponse<ServerPluginsWithPlugin[]>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async () => {
      const db = getClient();
      const plugins = await db.serverPlugins.findMany({
        where: { serverId },
        include: {
          plugin: true,
        },
      });

      return plugins;
    },
  );
}
