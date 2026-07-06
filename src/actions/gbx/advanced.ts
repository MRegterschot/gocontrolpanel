"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getGbxClient } from "@/lib/managers/gbxclient-manager";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";

export async function connectFakePlayer(
  serverId: string,
): Promise<ServerResponse<string>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async (session) => {
      const client = await getGbxClient(serverId);
      const login = await client.call("ConnectFakePlayer");
      await logAudit(
        session.user.id,
        serverId,
        "server.advanced.fakeplayer.connect",
      );
      return login;
    },
  );
}

export async function disconnectFakePlayer(
  serverId: string,
  login: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("DisconnectFakePlayer", login);
      await logAudit(
        session.user.id,
        serverId,
        "server.advanced.fakeplayer.disconnect",
        login,
      );
    },
  );
}

export async function getJoinLink(
  serverId: string,
): Promise<ServerResponse<string>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async () => {
      const client = await getGbxClient(serverId);
      const serverInfo = await client.call("GetMainServerPlayerInfo");
      const joinLink = `#join=${serverInfo.Login}@Trackmania`;
      return joinLink;
    },
  );
}
