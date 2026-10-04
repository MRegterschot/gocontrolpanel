"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { decryptHetznerToken, encryptHetznerToken } from "@/lib/hetzner";
import { getList } from "@/lib/utils";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "./server-only/audit-logs";
import { EditHetznerProjects, HetznerProjectsWithUsers, hetznerProjectUsersSchema } from "@/services/database/hetzner-projects";

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
