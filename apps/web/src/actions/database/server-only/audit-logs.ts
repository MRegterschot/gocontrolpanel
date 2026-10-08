import { getClient } from "@/lib/dbclient";
import { Prisma } from "@gcp/db";
import "server-only";

export async function logAudit(
  // null for a player without a panel account
  userId: string | null,
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
