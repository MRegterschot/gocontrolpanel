import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { ServerResponse } from "@/types/responses";
import "server-only";

export async function savedEcmApiKey(serverId: string): Promise<string> {
  const plugin = await getClient().serverPlugins.findFirst({
    where: { serverId, plugin: { name: "ecm", deletedAt: null } },
    select: { config: true },
  });
  const config = plugin?.config;
  return config &&
    typeof config === "object" &&
    !Array.isArray(config) &&
    typeof config.apiKey === "string"
    ? config.apiKey.trim()
    : "";
}

export async function getEcmApiKey(
  serverId: string,
): Promise<ServerResponse<string>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async () => savedEcmApiKey(serverId),
  );
}
