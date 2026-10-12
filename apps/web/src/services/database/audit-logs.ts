import { adminAuditScope } from "@/actions/database/server-only/audit-scope";
import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { PaginationResponse, ServerResponse } from "@/types/responses";
import { Prisma } from "@gcp/db";
import { PaginationState } from "@tanstack/react-table";
import "server-only";

const auditLogsUsersSchema = Prisma.validator<Prisma.AuditLogsInclude>()({
  user: { select: { id: true, login: true, nickName: true } },
});

export type AuditLogsWithUsers = Prisma.AuditLogsGetPayload<{
  include: typeof auditLogsUsersSchema;
}>;

export async function getAuditLogsPaginated(
  pagination: PaginationState,
  sorting: { field: string; order: "asc" | "desc" },
  filter?: string,
): Promise<ServerResponse<PaginationResponse<AuditLogsWithUsers>>> {
  return doServerActionWithAuth(
    [
      "audit-logs:view",
      "servers::admin",
      "groups::admin",
      "group:servers::admin",
      "hetzner::admin",
    ],
    async (session) => {
      const db = getClient();

      const where: Prisma.AuditLogsWhereInput = {
        deletedAt: null,
      };

      if (filter) {
        where.AND = [
          {
            OR: [
              { action: { contains: filter } },
              { targetId: { contains: filter } },
              { user: { nickName: { contains: filter } } },
            ],
          },
        ];
      }

      if (
        !session.user.admin &&
        !session.user.permissions.includes("audit-logs:view")
      ) {
        const scope = adminAuditScope(session);
        if (!scope) {
          return {
            data: [],
            totalCount: 0,
          };
        }

        where.AND = [
          ...((where.AND as Prisma.AuditLogsWhereInput[]) ?? []),
          scope,
        ];
      }

      const totalCount = await db.auditLogs.count({
        where,
      });

      const auditLogs = await db.auditLogs.findMany({
        where,
        skip: pagination.pageIndex * pagination.pageSize,
        take: pagination.pageSize,
        orderBy: {
          [sorting.field]: sorting.order.toLowerCase(),
        },
        include: auditLogsUsersSchema,
      });

      return {
        data: auditLogs,
        totalCount,
      };
    },
  );
}
