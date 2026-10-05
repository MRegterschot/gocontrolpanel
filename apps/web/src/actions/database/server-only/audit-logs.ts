import { getClient } from "@/lib/dbclient";
import { Prisma } from "@tmcp/db";
import "server-only";

export async function logAudit(
  userId: string,
  targetId: string,
  action: string,
  details?: Prisma.InputJsonValue,
  error?: string,
): Promise<void> {
  const db = getClient();

  await db.auditLogs.create({
    data: {
      userId,
      action,
      targetType: action.split(".")[0],
      targetId,
      details,
      error,
    },
  });
}
