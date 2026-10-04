import { doServerActionWithAuth } from "@/lib/actions";
import { getGbxClient } from "@/lib/gbx-service";
import { ServerPlugin } from "@/types/gbx/server-plugin";
import { ServerResponse } from "@/types/responses";
import "server-only";

export async function getServerPlugin(
  serverId: string,
): Promise<ServerResponse<ServerPlugin>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async () => {
      const client = getGbxClient(serverId);
      return await client.call("GetServerPlugin");
    },
  );
}
