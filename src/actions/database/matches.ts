"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { Prisma } from "@/lib/prisma/generated";
import { getList } from "@/lib/utils";
import { PaginationResponse, ServerResponse } from "@/types/responses";
import { PaginationState } from "@tanstack/react-table";
import slugid from "slugid";
import { logAudit } from "./server-only/audit-logs";

const matchesMapRecordsSchema = Prisma.validator<Prisma.MatchesInclude>()({
  map: true,
  records: {
    include: {
      user: {
        select: {
          nickName: true,
        },
      },
    },
  },
  _count: {
    select: {
      records: true,
    },
  },
});

export type MatchesWithMapAndRecords = Prisma.MatchesGetPayload<{
  include: typeof matchesMapRecordsSchema;
}>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const recordsUsersSchema = Prisma.validator<Prisma.RecordsInclude>()({
  user: {
    select: {
      nickName: true,
    },
  },
});

export type RecordsWithUser = Prisma.RecordsGetPayload<{
  include: typeof recordsUsersSchema;
}>;

export async function getMatchesPaginated(
  pagination: PaginationState,
  sorting: { field: string; order: "asc" | "desc" },
  filter: string,
  fetchArgs?: {
    serverId: string;
  },
): Promise<ServerResponse<PaginationResponse<MatchesWithMapAndRecords>>> {
  if (!fetchArgs?.serverId) {
    throw new Error("Server ID is required to fetch matches.");
  }

  return doServerActionWithAuth(
    [
      `servers:${fetchArgs.serverId}:member`,
      `servers:${fetchArgs.serverId}:moderator`,
      `servers:${fetchArgs.serverId}:admin`,
      `group:servers:${fetchArgs.serverId}:member`,
      `group:servers:${fetchArgs.serverId}:moderator`,
      `group:servers:${fetchArgs.serverId}:admin`,
    ],
    async () => {
      const db = getClient();

      const where = {
        deletedAt: null,
        serverId: fetchArgs.serverId,
        records: {
          some: {
            time: { not: -1 },
          },
        },
        OR: [
          { mode: { contains: filter } },
          {
            map: {
              name: { contains: filter },
            },
          },
        ],
      };

      const matches = await db.matches.findMany({
        skip: pagination.pageIndex * pagination.pageSize,
        take: pagination.pageSize,
        orderBy: { [sorting.field]: sorting.order },
        where,
        include: matchesMapRecordsSchema,
      });

      const totalCount = await db.matches.count({
        where,
      });

      return {
        data: matches,
        totalCount,
      };
    },
  );
}

export async function deleteMatch(
  serverId: string,
  matchId: string,
): Promise<ServerResponse<void>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const db = getClient();

      await db.matches.update({
        where: { id: matchId },
        data: { deletedAt: new Date() },
      });

      await logAudit(
        session.user.id,
        serverId,
        "server.records.match.delete",
        matchId,
      );
    },
  );
}

export async function exportMatchToCSV(
  serverId: string,
  matchId: string,
  headers: string[] = [
    "Time",
    "Track",
    "PlayerID",
    "PlayerName",
    "Record",
    "RoundNumber",
    "Points",
    "CP",
  ],
  values: string[] = [
    "createdAt",
    "map.name",
    "accountId",
    "user.nickName",
    "time",
    "round",
    "points",
    "checkpoints",
  ],
): Promise<ServerResponse<string>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:member`,
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:member`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const db = getClient();

      const match = await db.matches.findUnique({
        where: { id: matchId, serverId },
        include: {
          records: {
            include: {
              user: {
                select: {
                  nickName: true,
                },
              },
            },
          },
          map: true,
        },
      });

      if (!match) {
        throw new Error("Match not found");
      }

      const csvRows = [];
      csvRows.push(headers.join(","));

      for (const record of match.records) {
        const row = values.map((value) => {
          switch (value) {
            case "createdAt":
              return record.createdAt.getTime();
            case "map.name":
              return match.map.name;
            case "accountId":
              return record.login ? slugid.decode(record.login) : "";
            case "user.nickName":
              return record.user ? record.user.nickName : "";
            case "time":
              return record.time;
            case "round":
              return record.round;
            case "points":
              return record.points;
            case "checkpoints":
              return getList<number>(record.checkpoints).join(" ");
            default:
              return "";
          }
        });

        csvRows.push(row.join(","));
      }

      return csvRows.join("\n");
    },
  );
}
