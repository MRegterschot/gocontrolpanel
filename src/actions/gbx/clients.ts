"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getGbxClientManager } from "@/lib/managers/gbxclient-manager";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";

export async function stopReconnect(
  serverId: string,
): Promise<ServerResponse<void>> {
  return doServerActionWithAuth(["servers:clients:manage"], async (session) => {
    const manager = await getGbxClientManager(serverId);

    if (!manager) {
      throw new Error("Client not found");
    }

    manager.stopReconnect();

    await logAudit(session.user.id, serverId, "server.clients.reconnect.stop");
  });
}

export async function triggerReconnect(
  serverId: string,
): Promise<ServerResponse<void>> {
  return doServerActionWithAuth(["servers:clients:manage"], async (session) => {
    const manager = await getGbxClientManager(serverId);

    if (!manager) {
      throw new Error("Client not found");
    }

    manager.tryConnectWithRetry();

    await logAudit(
      session.user.id,
      serverId,
      "server.clients.reconnect.trigger",
    );
  });
}

export async function resendAllManialinks(
  serverId: string,
): Promise<ServerResponse<void>> {
  return doServerActionWithAuth(["servers:clients:manage"], async (session) => {
    const manager = await getGbxClientManager(serverId);

    if (!manager) {
      throw new Error("Client not found");
    }

    manager.resendAllManialinks();

    await logAudit(
      session.user.id,
      serverId,
      "server.clients.manialinks.resend",
    );
  });
}

export async function disconnectClient(
  serverId: string,
): Promise<ServerResponse<void>> {
  return doServerActionWithAuth(["servers:clients:manage"], async (session) => {
    const manager = await getGbxClientManager(serverId);

    if (!manager) {
      throw new Error("Client not found");
    }

    manager.emit("disconnect");

    await logAudit(session.user.id, serverId, "server.clients.disconnect");
  });
}
