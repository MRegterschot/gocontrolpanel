import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { decryptHetznerToken } from "@/lib/hetzner";
import { getList, hasPermissionSync } from "@/lib/utils";
import { PaginationResponse, ServerResponse } from "@/types/responses";
import { Prisma } from "@tmcp/db";
import { PaginationState } from "@tanstack/react-table";
import "server-only";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const editHetznerProject = Prisma.validator<Prisma.HetznerProjectsInclude>()({
  hetznerProjectUsers: {
    select: {
      userId: true,
      role: true,
    },
  },
});

export type EditHetznerProjects = Prisma.HetznerProjectsGetPayload<{
  include: typeof editHetznerProject;
}>;

export const hetznerProjectUsersSchema =
  Prisma.validator<Prisma.HetznerProjectsInclude>()({
    hetznerProjectUsers: {
      include: {
        user: {
          select: {
            id: true,
            login: true,
            nickName: true,
          },
        },
      },
    },
    _count: {
      select: {
        hetznerProjectUsers: true,
      },
    },
  });

export type HetznerProjectsWithUsers = Prisma.HetznerProjectsGetPayload<{
  include: typeof hetznerProjectUsersSchema;
}>;

export async function getHetznerProjectsPaginated(
  pagination: PaginationState,
  sorting: { field: string; order: "asc" | "desc" },
  filter?: string,
): Promise<ServerResponse<PaginationResponse<HetznerProjectsWithUsers>>> {
  return doServerActionWithAuth(
    ["hetzner:view", "hetzner:create", "hetzner::moderator", "hetzner::admin"],
    async (session) => {
      const db = getClient();

      const where: Prisma.HetznerProjectsWhereInput = {
        deletedAt: null,
        ...(filter && {
          OR: [{ name: { contains: filter } }],
        }),
      };

      if (
        !session.user.admin &&
        !session.user.permissions.includes("hetzner:view")
      ) {
        const userProjects = session.user.projects.map((p) => p.id);

        if (userProjects.length === 0) {
          return {
            totalCount: 0,
            data: [],
          };
        }

        where.id = { in: userProjects };
      }

      const totalCount = await db.hetznerProjects.count({
        where,
      });

      const projects = await db.hetznerProjects.findMany({
        where,
        include: hetznerProjectUsersSchema,
        orderBy: { [sorting.field]: sorting.order },
        skip: pagination.pageIndex * pagination.pageSize,
        take: pagination.pageSize,
      });

      return {
        totalCount,
        data: projects.map((project) => ({
          ...project,
          apiTokens: hasPermissionSync(
            session,
            ["hetzner:edit", "hetzner:id:admin"],
            project.id,
          )
            ? getList<string>(project.apiTokens).map((token) =>
                decryptHetznerToken(token),
              )
            : Array.from({ length: getList(project.apiTokens).length }, () =>
                crypto.randomUUID(),
              ),
        })),
      };
    },
  );
}
