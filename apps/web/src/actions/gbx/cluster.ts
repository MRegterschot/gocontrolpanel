"use server";
import { doServerActionWithAuth } from "@/lib/actions";
import { gbxService } from "@/lib/gbx-service";
import { assertResourceId } from "@/lib/resource-id";
import { ServerError } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";

function validateWorker(id: string) {
  if (
    typeof id !== "string" ||
    !id.length ||
    id.length > 200 ||
    !/^[\w.:-]+$/.test(id)
  )
    throw new Error("Invalid worker id");
}
export async function moveServer(serverId: string, workerId: string) {
  return doServerActionWithAuth(["servers:clients:manage"], async (session) => {
    if (!session.user.admin)
      throw new ServerError("Unauthorized", "Unauthorized");
    assertResourceId(serverId);
    validateWorker(workerId);
    await gbxService.moveServer(serverId, workerId);
    await logAudit(session.user.id, serverId, "server.cluster.move", {
      workerId: workerId ?? null,
    });
  });
}
export async function claimServer(serverId: string, workerId?: string) {
  return doServerActionWithAuth(["servers:clients:manage"], async (session) => {
    if (!session.user.admin)
      throw new ServerError("Unauthorized", "Unauthorized");
    assertResourceId(serverId);
    if (workerId !== undefined) validateWorker(workerId);
    await gbxService.claimServer(serverId, workerId);
    await logAudit(session.user.id, serverId, "server.cluster.claim", {
      workerId: workerId ?? null,
    });
  });
}
export async function holdServer(serverId: string) {
  return doServerActionWithAuth(["servers:clients:manage"], async (session) => {
    if (!session.user.admin)
      throw new ServerError("Unauthorized", "Unauthorized");
    assertResourceId(serverId);

    await gbxService.holdServer(serverId);
    await logAudit(session.user.id, serverId, "server.cluster.hold");
  });
}
export async function unholdServer(serverId: string) {
  return doServerActionWithAuth(["servers:clients:manage"], async (session) => {
    if (!session.user.admin)
      throw new ServerError("Unauthorized", "Unauthorized");
    assertResourceId(serverId);

    await gbxService.unholdServer(serverId);
    await logAudit(session.user.id, serverId, "server.cluster.unhold");
  });
}
export async function restartWorker(workerId: string) {
  return doServerActionWithAuth(["servers:clients:manage"], async (session) => {
    if (!session.user.admin)
      throw new ServerError("Unauthorized", "Unauthorized");
    validateWorker(workerId);
    await gbxService.restartWorker(workerId);
    await logAudit(session.user.id, workerId, "cluster.worker.restart", {
      workerId,
    });
  });
}
