"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getGbxClientManager } from "@/lib/managers/gbxclient-manager";
import { ServerResponse } from "@/types/responses";

export async function stopReconnect(
  serverId: string,
): Promise<ServerResponse<void>> {
  return doServerActionWithAuth(["servers:clients:manage"], async () => {
    const client = await getGbxClientManager(serverId);

    if (!client) {
      throw new Error("Client not found");
    }

    client.stopReconnect();
  });
}
