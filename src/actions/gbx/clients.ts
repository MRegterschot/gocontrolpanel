"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getGbxClientManager } from "@/lib/managers/gbxclient-manager";
import { ServerResponse } from "@/types/responses";

export async function stopReconnect(
  serverId: string,
): Promise<ServerResponse<void>> {
  return doServerActionWithAuth(["servers:clients:manage"], async () => {
    const manager = await getGbxClientManager(serverId);

    if (!manager) {
      throw new Error("Client not found");
    }

    manager.stopReconnect();
  });
}

export async function triggerReconnect(
  serverId: string,
): Promise<ServerResponse<void>> {
  return doServerActionWithAuth(["servers:clients:manage"], async () => {
    const manager = await getGbxClientManager(serverId);

    if (!manager) {
      throw new Error("Client not found");
    }

    manager.tryConnectWithRetry();
  });
}
