"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { decryptHetznerToken, encryptHetznerToken } from "@/lib/hetzner";
import { hasPermissionSync } from "@/lib/permissions";
import { Prisma } from "@/lib/prisma/generated";
import { getList } from "@/lib/utils";
import { PaginationResponse, ServerResponse } from "@/types/responses";
import { PaginationState } from "@tanstack/react-table";
import { logAudit } from "./server-only/audit-logs";

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

const hetznerProjectUsersSchema =
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

export async function createHetznerProject(
  hetznerProject: Omit<
    EditHetznerProjects,
    "id" | "createdAt" | "updatedAt" | "deletedAt"
  >,
): Promise<ServerResponse<HetznerProjectsWithUsers>> {
  return doServerActionWithAuth(["hetzner:create"], async (session) => {
    const db = getClient();

    const { hetznerProjectUsers, apiTokens, ...projectData } = hetznerProject;
    const newProject = await db.hetznerProjects.create({
      data: {
        ...projectData,
        apiTokens: getList<string>(apiTokens).map((token) =>
          encryptHetznerToken(token),
        ),
        hetznerProjectUsers: {
          create: hetznerProjectUsers.map((hpu) => ({
            role: hpu.role,
            userId: hpu.userId,
          })),
        },
      },
      include: hetznerProjectUsersSchema,
    });

    await logAudit(
      session.user.id,
      newProject.id,
      "hetzner.project.create",
      hetznerProject,
    );

    return {
      ...newProject,
      apiTokens: getList<string>(newProject.apiTokens).map((token) =>
        decryptHetznerToken(token),
      ),
    };
  });
}

export async function updateHetznerProject(
  hetznerProjectId: string,
  hetznerProject: Partial<
    Omit<EditHetznerProjects, "id" | "createdAt" | "updatedAt" | "deletedAt">
  >,
): Promise<ServerResponse<HetznerProjectsWithUsers>> {
  return doServerActionWithAuth(
    ["hetzner:edit", `hetzner:${hetznerProjectId}:admin`],
    async (session) => {
      const db = getClient();

      const { hetznerProjectUsers, apiTokens, ...projectData } = hetznerProject;

      const updatedHetznerProject = await db.hetznerProjects.update({
        where: {
          id: hetznerProjectId,
        },
        data: {
          ...projectData,
          apiTokens: getList<string>(apiTokens).map((token) =>
            encryptHetznerToken(token),
          ),
          hetznerProjectUsers: {
            deleteMany: {},
            create: hetznerProjectUsers?.map((hpu) => ({
              role: hpu.role,
              userId: hpu.userId,
            })),
          },
        },
        include: hetznerProjectUsersSchema,
      });

      await logAudit(
        session.user.id,
        hetznerProjectId,
        "hetzner.project.edit",
        hetznerProject,
      );

      return {
        ...updatedHetznerProject,
        apiTokens: getList<string>(updatedHetznerProject.apiTokens).map(
          (token) => decryptHetznerToken(token),
        ),
      };
    },
  );
}

export async function deleteHetznerProject(
  hetznerProjectId: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    ["hetzner:delete", `hetzner:${hetznerProjectId}:admin`],
    async (session) => {
      const db = getClient();

      await db.hetznerProjects.update({
        where: {
          id: hetznerProjectId,
        },
        data: { deletedAt: new Date() },
      });

      await logAudit(
        session.user.id,
        hetznerProjectId,
        "hetzner.project.delete",
      );
    },
  );
}
