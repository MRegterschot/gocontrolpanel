"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { actorFromSession } from "@/lib/actor";
import { getGbxClient } from "@/lib/gbx-service";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";
import { sendChatMessageAs } from "./server-only/advanced";

export async function connectFakePlayer(
  serverId: string,
): Promise<ServerResponse<string>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async (session) => {
      const client = getGbxClient(serverId);
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
      const client = getGbxClient(serverId);
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

export async function sendChatMessage(
  serverId: string,
  message: string,
  login?: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) =>
      sendChatMessageAs(actorFromSession(session), serverId, message, login),
  );
}
