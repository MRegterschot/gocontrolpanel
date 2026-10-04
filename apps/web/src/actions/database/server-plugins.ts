"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { gbxService, publishServerEvent } from "@/lib/gbx-service";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "./server-only/audit-logs";

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

      await publishServerEvent({ type: "server.plugins.updated", serverId });

      await logAudit(
        session.user.id,
        serverId,
        "server.plugins.plugins.edit",
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

      // Check if plugin exists for server
      const existingPlugin = await db.serverPlugins.findUnique({
        where: {
          serverId_pluginId: {
            serverId,
            pluginId,
          },
        },
      });

      // If not, create it with the config
      if (!existingPlugin) {
        await db.serverPlugins.create({
          data: {
            serverId,
            pluginId,
            enabled: false,
            config,
          },
        });
        return;
      } else {
        await db.serverPlugins.updateMany({
          where: {
            serverId,
            pluginId,
          },
          data: {
            config,
          },
        });
      }

      await publishServerEvent({ type: "server.plugins.updated", serverId });

      await logAudit(
        session.user.id,
        serverId,
        "server.plugins.plugins.config.edit",
        { pluginId, config },
      );
    },
  );
}

export async function reloadServerPlugins(
  serverId: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async () => {
      await gbxService.reloadPlugins(serverId);
    },
  );
}
