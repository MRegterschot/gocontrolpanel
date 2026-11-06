import { doServerActionWithAuth } from "@/lib/actions";
import { type Actor, actorFromSession, requirePermission } from "@/lib/actor";
import { getGbxClient } from "@/lib/gbx-service";
import { ServerResponse } from "@/types/responses";
import { serverPermissions, SPlayerInfo } from "@tmcontrolpanel/shared";
import "server-only";

export async function getJoinLink(
  serverId: string,
): Promise<ServerResponse<string>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    (session) => getJoinLinkAs(actorFromSession(session), serverId),
  );
}

// A link that joins the server from the game; it carries the password, so admins only
export async function getJoinLinkAs(
  actor: Actor,
  serverId: string,
): Promise<string> {
  requirePermission(actor, serverPermissions.admin, serverId);

  const client = getGbxClient(serverId);
  const [serverInfo, serverOptions] = await client.multicall([
    ["GetMainServerPlayerInfo"],
    ["GetServerOptions"],
  ]);

  return `#qjoin=${serverInfo.Login}${serverOptions.Password ? `:${serverOptions.Password}` : ""}@Trackmania`;
}

export async function getServerPlayerInfo(
  serverId: string,
): Promise<ServerResponse<SPlayerInfo>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:member`,
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:member`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const client = getGbxClient(serverId);
      return await client.call("GetMainServerPlayerInfo");
    },
  );
}

export async function getChatHistory(
  serverId: string,
): Promise<ServerResponse<string[]>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:member`,
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:member`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) => getChatHistoryAs(actorFromSession(session), serverId),
  );
}

// Recent chat lines as the server shows them, formatting tags included
export async function getChatHistoryAs(
  actor: Actor,
  serverId: string,
): Promise<string[]> {
  requirePermission(actor, serverPermissions.member, serverId);
  return getGbxClient(serverId).call("GetChatLines");
}
