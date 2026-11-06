"use server";
import { assertResourceId } from "@/lib/resource-id";

import { doServerActionWithAuth } from "@/lib/actions";
import { actorFromSession } from "@/lib/actor";
import { ServerResponse } from "@/types/responses";
import {
  connectFakePlayerAs,
  disconnectFakePlayerAs,
  sendChatMessageAs,
} from "./server-only/advanced";

export async function connectFakePlayer(
  serverId: string,
): Promise<ServerResponse<string>> {
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    (session) => connectFakePlayerAs(actorFromSession(session), serverId),
  );
}

export async function disconnectFakePlayer(
  serverId: string,
  login: string,
): Promise<ServerResponse> {
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    (session) =>
      disconnectFakePlayerAs(actorFromSession(session), serverId, login),
  );
}

export async function sendChatMessage(
  serverId: string,
  message: string,
  login?: string,
): Promise<ServerResponse> {
  assertResourceId(serverId);
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
