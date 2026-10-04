import { ServerPluginsWithPlugin } from "@/actions/database/server-only/gbx";
import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { getLogger } from "@/lib/logger";
import { ServerError, ServerResponse } from "@/types/responses";
import "server-only";

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

export async function exportServerPluginConfig(
  serverId: string,
  pluginId: string,
): Promise<ServerResponse<Record<string, any>>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async () => {
      const meta = {
        type: "database",
        module: "server-plugins",
        function: "exportServerPluginConfig",
      };
      const log = getLogger(serverId);
      const db = getClient();

      const plugin = await db.serverPlugins.findUnique({
        where: {
          serverId_pluginId: {
            serverId,
            pluginId,
          },
        },
      });

      if (!plugin) {
        log.warn({ meta, pluginId }, "Plugin not found for server");
        throw new ServerError("Plugin not found for server", "PluginNotFound");
      }

      return plugin.config as Record<string, any>;
    },
  );
}
