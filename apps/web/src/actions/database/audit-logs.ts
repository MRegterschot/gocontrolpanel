"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { logger } from "@/lib/logger";
import { ServerError, ServerResponse } from "@/types/responses";
import { Prisma } from "@tmcontrolpanel/db";
import { auditLogData } from "./server-only/audit-logs";
import { adminAuditScope } from "./server-only/audit-scope";

export async function deleteAuditLogById(id: string): Promise<ServerResponse> {
  return doServerActionWithAuth(["audit-logs:delete"], async (session) => {
    const meta = {
      type: "database",
      module: "audit-logs",
      function: "deleteAuditLogById",
    };

    const db = getClient();

    const where: Prisma.AuditLogsWhereUniqueInput = {
      id,
      deletedAt: null,
    };

    if (
      !session.user.admin &&
      !session.user.permissions.includes("audit-logs:delete")
    ) {
      const scope = adminAuditScope(session);
      if (!scope) {
        logger.warn(
          { meta, userId: session.user.id, auditLogId: id },
          "Not authorized to delete this log",
        );
        throw new ServerError(
          "Not authorized to delete this log.",
          "AuditLogNotAuthorized",
        );
      }

      where.AND = [scope];
    }

    const auditLog = await db.auditLogs.findUnique({
      where,
    });

    if (!auditLog) {
      logger.warn({ meta, id }, "Audit log not found");
      throw new ServerError("Audit log not found.", "AuditLogNotFound");
    }

    await db.$transaction([
      db.auditLogs.update({
        where,
        data: {
          deletedAt: new Date(),
        },
      }),
      // Deleting an audit entry is itself audited
      db.auditLogs.create({
        data: auditLogData(session.user.id, id, "audit-logs.delete", {
          action: auditLog.action,
          targetType: auditLog.targetType,
          targetId: auditLog.targetId,
        }),
      }),
    ]);
  });
}
