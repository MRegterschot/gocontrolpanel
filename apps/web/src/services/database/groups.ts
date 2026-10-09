import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { PaginationResponse, ServerResponse } from "@/types/responses";
import { Prisma } from "@gcp/db";
import { PaginationState } from "@tanstack/react-table";
import "server-only";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const editGroup = Prisma.validator<Prisma.GroupsInclude>()({
  groupMembers: {
    select: {
      userId: true,
      role: true,
      order: true,
      serversOrder: true,
    },
  },
  groupServers: {
    select: {
      serverId: true,
    },
  },
});

// The theme has its own action and form
export type EditGroups = Omit<
  Prisma.GroupsGetPayload<{ include: typeof editGroup }>,
  "theme"
>;

export const groupUsersServersSchema = Prisma.validator<Prisma.GroupsInclude>()(
  {
    groupMembers: {
      include: {
        user: true,
      },
    },
    groupServers: {
      where: {
        server: {
          deletedAt: null,
        },
      },
      include: {
        // Credentials stay on the server
        server: { omit: { password: true, filemanagerPassword: true } },
      },
    },
    _count: {
      select: {
        groupMembers: true,
      },
    },
  },
);

export type GroupsWithUsersWithServers = Prisma.GroupsGetPayload<{
  include: typeof groupUsersServersSchema;
}>;

export async function getGroupsPaginated(
  pagination: PaginationState,
  sorting: { field: string; order: "asc" | "desc" },
  filter?: string,
): Promise<ServerResponse<PaginationResponse<GroupsWithUsersWithServers>>> {
  return doServerActionWithAuth(
    ["groups:view", "groups:create", "groups::moderator", "groups::admin"],
    async (session) => {
      const db = getClient();

      const where: Prisma.GroupsWhereInput = {
        deletedAt: null,
        ...(filter && {
          OR: [
            { name: { contains: filter } },
            { description: { contains: filter } },
          ],
        }),
      };

      if (
        !session.user.admin &&
        !session.user.permissions.includes("groups:view")
      ) {
        const userGroupIds = session.user.groups.map((g) => g.id);

        if (userGroupIds.length === 0) {
          return {
            data: [],
            totalCount: 0,
          };
        }

        where.id = { in: userGroupIds };
      }

      const totalCount = await db.groups.count({
        where,
      });

      const groups = await db.groups.findMany({
        where,
        skip: pagination.pageIndex * pagination.pageSize,
        take: pagination.pageSize,
        orderBy: {
          [sorting.field]: sorting.order.toLowerCase(),
        },
        include: groupUsersServersSchema,
      });

      return {
        data: groups,
        totalCount,
      };
    },
  );
}
