import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { gbxService } from "@/lib/gbx-service";
import { ServerError, type ServerResponse } from "@/types/responses";
import type { PluginManialinkSnapshot } from "@gcp/shared";
import "server-only";
import { z } from "zod";

export async function getPluginManialinks(
  serverId: string,
  pluginId: string,
): Promise<ServerResponse<PluginManialinkSnapshot>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async () => {
      const args = z
        .object({
          serverId: z.string().min(1).max(100),
          pluginId: z.string().min(1).max(100),
        })
        .parse({ serverId, pluginId });
      const installed = await getClient().serverPlugins.findFirst({
        where: {
          serverId: args.serverId,
          pluginId: args.pluginId,
          server: { deletedAt: null },
          plugin: { deletedAt: null },
        },
        select: { pluginId: true },
      });
      if (!installed)
        throw new ServerError(
          "The plugin is not installed on this server",
          "PluginNotFound",
        );
      return gbxService.pluginManialinks(args.serverId, args.pluginId);
    },
  );
}
