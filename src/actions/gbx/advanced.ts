"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getGbxClient } from "@/lib/managers/gbxclient-manager";
import { SPlayerInfo } from "@/types/gbx/player";
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

export async function getServerPlayerInfo(
  serverId: string,
): Promise<ServerResponse<SPlayerInfo>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const client = await getGbxClient(serverId);
      return await client.call("GetMainServerPlayerInfo");
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
    async (session) => {
      // Get the user's role for the given server
      const role =
        session.user.servers.find((s) => s.id === serverId)?.role === "Admin" ||
        session.user.groups
          .filter((g) => g.servers.some((s) => s.id === serverId))
          .some((g) => g.role === "Admin")
          ? "Admin"
          : "Moderator";

      const roleColor = role === "Admin" ? "D00" : "FC0";
      const fullMessage = `$z[$${roleColor}${role}$z] ${session.user.displayName}: ${message.trim()}`;

      const client = await getGbxClient(serverId);
      if (login) {
        await client.call("ChatSendServerMessageToLogin", fullMessage, login);
      } else {
        await client.call("ChatSendServerMessage", fullMessage);
      }

      await logAudit(
        session.user.id,
        serverId,
        "server.live.chat.send",
        message,
      );
    },
  );
}

export async function getChatHistory(
  serverId: string,
): Promise<ServerResponse<string[]>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const client = await getGbxClient(serverId);
      return await client.call("GetChatLines");
    },
  );
}
