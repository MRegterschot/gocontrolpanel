"use server";

import { reloadServerPluginsAs } from "@/actions/server-only/plugins";
import { doServerActionWithAuth } from "@/lib/actions";
import { actorFromSession } from "@/lib/actor";
import { getClient } from "@/lib/dbclient";
import { publishServerEvent } from "@/lib/gbx-service";
import { ServerError, ServerResponse } from "@/types/responses";
import type { Prisma } from "@gcp/db";
import { isFirstPartySlug } from "@gcp/shared";
import { logAudit } from "./server-only/audit-logs";

// Settings from the panel's own forms for the first-party plugins; other plugins
// are configured through their config schema (actions/plugins.ts)
export async function updateServerPlugin(
  serverId: string,
  pluginId: string,
  config: Record<string, any>,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async (session) => {
      const db = getClient();

      const row = await db.serverPlugins.findUnique({
        where: { serverId_pluginId: { serverId, pluginId } },
        select: {
          versionId: true,
          plugin: { select: { name: true, source: true } },
        },
      });
      if (
        !row?.versionId ||
        row.plugin.source !== "marketplace" ||
        !isFirstPartySlug(row.plugin.name)
      ) {
        throw new ServerError(
          "The plugin is not installed on this server",
          "PluginNotFound",
        );
      }

      await db.serverPlugins.update({
        where: { serverId_pluginId: { serverId, pluginId } },
        data: { config: config as Prisma.InputJsonValue },
      });

      await publishServerEvent({ type: "server.plugins.updated", serverId });

      await logAudit(session.user.id, serverId, "server.plugins.config.edit", {
        slug: row.plugin.name,
        keys: Object.keys(config),
      });
    },
  );
}

export async function reloadServerPlugins(
  serverId: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    (session) => reloadServerPluginsAs(actorFromSession(session), serverId),
  );
}
