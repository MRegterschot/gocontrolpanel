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
    config?: Record<string, any>;
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
            config: p.config,
          },
          update: {
            enabled: p.enabled,
            config: p.config,
          },
        }),
      );

      await db.$transaction(pluginUpdates);

      const updatedPlugins = await db.serverPlugins.findMany({
        where: { serverId },
        include: {
          plugin: {
            include: {
              commands: true,
            },
          },
        },
      });

      const manager = await getGbxClientManager(serverId);

      manager.info.plugins = updatedPlugins;

      await logAudit(
        session.user.id,
        serverId,
        "server.interface.plugins.edit",
        plugins,
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
          plugin: {
            include: {
              commands: true,
            },
          },
        },
      });

      return plugins;
    },
  );
}
