"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { actorFromSession } from "@/lib/actor";
import { ServerResponse } from "@/types/responses";
import { addTmxMapToServerAs, downloadMapAs } from "./server-only/maps";

export async function downloadMap(
  serverId: string,
  mapId: number,
): Promise<ServerResponse<string>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) => downloadMapAs(actorFromSession(session), serverId, mapId),
  );
}

export async function addMapToServer(
  serverId: string,
  mapId: number,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      await addTmxMapToServerAs(actorFromSession(session), serverId, mapId);
    },
  );
}
