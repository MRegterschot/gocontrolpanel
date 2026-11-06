import { doServerActionWithAuth } from "@/lib/actions";
import { type Actor, requirePermission } from "@/lib/actor";
import { csvRow } from "@/lib/csv";
import { getClient } from "@/lib/dbclient";
import { getLogger } from "@/lib/logger";
import { getList } from "@/lib/utils";
import {
  PaginationResponse,
  ServerError,
  ServerResponse,
} from "@/types/responses";
import { PaginationState } from "@tanstack/react-table";
import { Prisma } from "@tmcontrolpanel/db";
import { serverPermissions } from "@tmcontrolpanel/shared";
import "server-only";
import slugid from "slugid";

const matchesMapRecordsSchema = Prisma.validator<Prisma.MatchesInclude>()({
  map: true,
  records: {
    where: { deletedAt: null },
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
      records: { where: { deletedAt: null } },
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
    throw new ServerError(
      "Server ID is required to fetch matches.",
      "ServerIdMissing",
    );
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
            deletedAt: null,
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
      const meta = {
        type: "database",
        module: "matches",
        function: "exportMatchToCSV",
      };
      const log = getLogger(serverId);
      const db = getClient();

      const match = await db.matches.findFirst({
        where: { id: matchId, serverId, deletedAt: null },
        include: {
          records: {
            where: { deletedAt: null },
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
        log.warn({ meta, serverId, matchId }, "Match not found");
        throw new ServerError("Match not found", "MatchNotFound");
      }

      const csvRows = [];
      csvRows.push(csvRow(headers));

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

        csvRows.push(csvRow(row));
      }

      return csvRows.join("\n");
    },
  );
}

// Same filter as the matches table: matches with at least one finished record
const recordedMatches = (serverId: string) => ({
  deletedAt: null,
  serverId,
  records: { some: { deletedAt: null, time: { not: -1 } } },
});

const matchSummary = Prisma.validator<Prisma.MatchesInclude>()({
  map: { select: { uid: true, name: true } },
  _count: { select: { records: { where: { deletedAt: null } } } },
});

export type MatchSummary = Prisma.MatchesGetPayload<{
  include: typeof matchSummary;
}>;

// Recorded matches, newest first, for an actor; page is 1-based
export async function getMatchesPageAs(
  actor: Actor,
  serverId: string,
  page: number,
  pageSize: number,
): Promise<{ matches: MatchSummary[]; total: number }> {
  requirePermission(actor, serverPermissions.member, serverId);

  const db = getClient();
  const where = recordedMatches(serverId);
  const [matches, total] = await Promise.all([
    db.matches.findMany({
      where,
      include: matchSummary,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.matches.count({ where }),
  ]);
  return { matches, total };
}

// One of the server's matches with its records, for an actor; null when it is not this server's
export async function getMatchAs(
  actor: Actor,
  serverId: string,
  matchId: string,
) {
  requirePermission(actor, serverPermissions.member, serverId);

  return getClient().matches.findFirst({
    where: { id: matchId, serverId, deletedAt: null },
    include: {
      ...matchSummary,
      records: {
        where: { deletedAt: null },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: { user: { select: { nickName: true } } },
      },
    },
  });
}
