"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import {
  createProjectInput,
  parseInput,
  updateProjectInput,
} from "@/lib/admin-inputs";
import { getClient } from "@/lib/dbclient";
import { decryptHetznerToken, encryptHetznerToken } from "@/lib/hetzner";
import { getList } from "@/lib/utils";
import {
  EditHetznerProjects,
  HetznerProjectsWithUsers,
  hetznerProjectUsersSchema,
} from "@/services/database/hetzner-projects";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "./server-only/audit-logs";

export async function createHetznerProject(
  hetznerProject: Omit<
    EditHetznerProjects,
    "id" | "createdAt" | "updatedAt" | "deletedAt"
  >,
): Promise<ServerResponse<HetznerProjectsWithUsers>> {
  return doServerActionWithAuth(["hetzner:create"], async (session) => {
    const db = getClient();

    const input = parseInput(createProjectInput, hetznerProject);
    const newProject = await db.hetznerProjects.create({
      data: {
        name: input.name,
        apiTokens: (input.apiTokens ?? []).map((token) =>
          encryptHetznerToken(token),
        ),
        hetznerProjectUsers: {
          create: (input.hetznerProjectUsers ?? []).map((hpu) => ({
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
      auditDetails(input),
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

      const input = parseInput(updateProjectInput, hetznerProject);

      const updatedHetznerProject = await db.hetznerProjects.update({
        where: {
          id: hetznerProjectId,
          deletedAt: null,
        },
        data: {
          name: input.name,
          // Tokens and members are only replaced when the caller sends them
          ...(input.apiTokens && {
            apiTokens: input.apiTokens.map((token) =>
              encryptHetznerToken(token),
            ),
          }),
          ...(input.hetznerProjectUsers && {
            hetznerProjectUsers: {
              deleteMany: {},
              create: input.hetznerProjectUsers.map((hpu) => ({
                role: hpu.role,
                userId: hpu.userId,
              })),
            },
          }),
        },
        include: hetznerProjectUsersSchema,
      });

      await logAudit(
        session.user.id,
        hetznerProjectId,
        "hetzner.project.edit",
        auditDetails(input),
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

// API tokens never go into the audit log
function auditDetails(input: {
  name?: string;
  apiTokens?: string[];
  hetznerProjectUsers?: { userId: string; role: string }[];
}) {
  return {
    name: input.name,
    apiTokens: input.apiTokens
      ? `${input.apiTokens.length} token(s)`
      : undefined,
    hetznerProjectUsers: input.hetznerProjectUsers,
  };
}
