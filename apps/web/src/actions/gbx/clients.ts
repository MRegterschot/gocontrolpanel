"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { gbxService } from "@/lib/gbx-service";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";

export async function stopReconnect(
  serverId: string,
): Promise<ServerResponse<void>> {
  return doServerActionWithAuth(["servers:clients:manage"], async (session) => {
    await gbxService.stopReconnect(serverId);

    await logAudit(session.user.id, serverId, "server.clients.reconnect.stop");
  });
}

export async function triggerReconnect(
  serverId: string,
): Promise<ServerResponse<void>> {
  return doServerActionWithAuth(["servers:clients:manage"], async (session) => {
    await gbxService.reconnect(serverId);

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
    await gbxService.resendManialinks(serverId);

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
    await gbxService.disconnect(serverId);

    await logAudit(session.user.id, serverId, "server.clients.disconnect");
  });
}
