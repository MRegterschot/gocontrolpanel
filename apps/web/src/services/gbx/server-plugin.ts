import { getServerPluginAs } from "@/actions/gbx/server-only/server-plugin";
import { doServerActionWithAuth } from "@/lib/actions";
import { actorFromSession } from "@/lib/actor";
import { ServerPlugin } from "@/types/gbx/server-plugin";
import { ServerResponse } from "@/types/responses";
import "server-only";

export async function getServerPlugin(
  serverId: string,
): Promise<ServerResponse<ServerPlugin>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    (session) => getServerPluginAs(actorFromSession(session), serverId),
  );
}
