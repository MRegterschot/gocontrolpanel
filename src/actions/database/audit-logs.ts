"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { logger } from "@/lib/logger";
import { Prisma } from "@/lib/prisma/generated";
import { PaginationResponse, ServerError, ServerResponse } from "@/types/responses";
import { PaginationState } from "@tanstack/react-table";

const auditLogsUsersSchema = Prisma.validator<Prisma.AuditLogsInclude>()({
  user: true,
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
        const userServerIds = session.user.servers.map((s) => s.id);
        const userGroupIds = session.user.groups.map((g) => g.id);
        const userGroupServerIds = session.user.groups
          .flatMap((g) => g.servers)
          .map((s) => s.id);
        const userHetznerIds = session.user.projects.map((p) => p.id);

        const allIds = [
          ...new Set([
            ...userServerIds,
            ...userGroupServerIds,
            ...userHetznerIds,
          ]),
        ];

        if (allIds.length === 0) {
          return {
            data: [],
            totalCount: 0,
          };
        }

        where.AND = [
          ...((where.AND as Prisma.AuditLogsWhereInput[]) ?? []),
          {
            OR: [
              {
                targetType: "server",
                targetId: { in: [...userServerIds, ...userGroupServerIds] },
              },
              { targetType: "group", targetId: { in: userGroupIds } },
              { targetType: "hetzner", targetId: { in: userHetznerIds } },
            ],
          },
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

export async function deleteAuditLogById(id: string): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      "audit-logs:delete",
      "servers::admin",
      "groups::admin",
      "group:servers::admin",
      "hetzner::admin",
    ],
    async (session) => {
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
        const userServerIds = session.user.servers.map((s) => s.id);
        const userGroupIds = session.user.groups.map((g) => g.id);
        const userGroupServerIds = session.user.groups
          .flatMap((g) => g.servers)
          .map((s) => s.id);
        const userHetznerIds = session.user.projects.map((p) => p.id);

        const allIds = [
          ...new Set([
            ...userServerIds,
            ...userGroupServerIds,
            ...userHetznerIds,
          ]),
        ];

        if (allIds.length === 0) {
          logger.warn(
            { meta, userId: session.user.id, auditLogId: id },
            "Not authorized to delete this log",
          );
          throw new ServerError("Not authorized to delete this log.", "AuditLogNotAuthorized");
        }

        where.OR = [
          {
            targetType: "server",
            targetId: { in: [...userServerIds, ...userGroupServerIds] },
          },
          { targetType: "group", targetId: { in: userGroupIds } },
          { targetType: "hetzner", targetId: { in: userHetznerIds } },
        ];
      }

      const auditLog = await db.auditLogs.findUnique({
        where,
      });

      if (!auditLog) {
        logger.warn({ meta, id }, "Audit log not found");
        throw new ServerError("Audit log not found.", "AuditLogNotFound");
      }

      await db.auditLogs.update({
        where,
        data: {
          deletedAt: new Date(),
        },
      });
    },
  );
}
