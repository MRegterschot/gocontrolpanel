import { getClient } from "@/lib/dbclient";
import { Prisma } from "@gcp/db";
import "server-only";

export function auditLogData(
  // null for a player without a panel account
  userId: string | null,
  targetId: string,
  action: string,
  details?: Prisma.InputJsonValue,
  error?: string,
): Prisma.AuditLogsUncheckedCreateInput {
  return {
    userId,
    action,
    targetType: action.split(".")[0],
    targetId,
    details,
    error,
  };
}

export async function logAudit(
  userId: string | null,
  targetId: string,
  action: string,
  details?: Prisma.InputJsonValue,
  error?: string,
): Promise<void> {
  await getClient().auditLogs.create({
    data: auditLogData(userId, targetId, action, details, error),
  });
}
