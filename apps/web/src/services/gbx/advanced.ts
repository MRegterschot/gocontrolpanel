import { doServerActionWithAuth } from "@/lib/actions";
import { getGbxClient } from "@/lib/gbx-service";
import { ServerResponse } from "@/types/responses";
import { SPlayerInfo } from "@tmcp/shared";
import "server-only";

export async function getJoinLink(
  serverId: string,
): Promise<ServerResponse<string>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async () => {
      const client = getGbxClient(serverId);
      const [serverInfo, serverOptions] = await client.multicall([
        ["GetMainServerPlayerInfo"],
        ["GetServerOptions"],
      ]);

      const joinLink = `#qjoin=${serverInfo.Login}${serverOptions.Password ? `:${serverOptions.Password}` : ""}@Trackmania`;
      return joinLink;
    },
  );
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
    async () => {
      const client = getGbxClient(serverId);
      return await client.call("GetChatLines");
    },
  );
}
