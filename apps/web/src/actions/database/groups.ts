"use server";
import { assertResourceId } from "@/lib/resource-id";

import { doServerActionWithAuth } from "@/lib/actions";
import {
  createGroupInput,
  parseInput,
  updateGroupInput,
} from "@/lib/admin-inputs";
import { getClient } from "@/lib/dbclient";
import { logger } from "@/lib/logger";
import { hasPermissionSync } from "@/lib/utils";
import {
  EditGroups,
  GroupsWithUsersWithServers,
  groupUsersServersSchema,
} from "@/services/database/groups";
import { UserGroup } from "@/types/auth";
import { ServerError, ServerResponse } from "@/types/responses";
import { serverPermissions } from "@tmcontrolpanel/shared";
import { Session } from "next-auth";
import { withAudit } from "./server-only/audit-logs";
import { groupServerIds, publishThemeChange } from "./server-only/themes";

export async function createGroup(
  group: Omit<EditGroups, "id" | "createdAt" | "updatedAt" | "deletedAt">,
): Promise<ServerResponse<GroupsWithUsersWithServers>> {
  return doServerActionWithAuth(["groups:create"], async (session) => {
    const input = parseInput(createGroupInput, group);
    const serverIds = uniqueServerIds(input.groupServers);
    requireServerAuthority(session, serverIds);

    const newGroup = await withAudit(
      (tx) =>
        tx.groups.create({
          data: {
            name: input.name,
            description: input.description ?? "",
            public: input.public,
            shareRecords: input.shareRecords,
            groupServers: {
              create: serverIds.map((serverId) => ({ serverId })),
            },
            groupMembers: {
              create: (input.groupMembers ?? []).map((gm) => ({
                role: gm.role,
                userId: gm.userId,
              })),
            },
          },
          include: groupUsersServersSchema,
        }),
      (newGroup) => [session.user.id, newGroup.id, "group.create", input],
    );

    return newGroup;
  });
}

export async function updateGroup(
  groupId: string,
  group: Partial<
    Omit<EditGroups, "id" | "createdAt" | "updatedAt" | "deletedAt">
  >,
): Promise<ServerResponse<GroupsWithUsersWithServers>> {
  assertResourceId(groupId);
  return doServerActionWithAuth(
    ["groups:edit", `groups:${groupId}:admin`],
    async (session) => {
      const input = parseInput(updateGroupInput, group);
      const previousServers = await groupServerIds(groupId);

      // Linking or unlinking a server needs authority over that server, not just the group.
      // Links to deleted servers are left alone.
      let added: string[] = [];
      let removed: string[] = [];
      if (input.groupServers) {
        const serverIds = uniqueServerIds(input.groupServers);
        const active = await activeGroupServerIds(groupId);
        added = serverIds.filter((id) => !active.includes(id));
        removed = active.filter((id) => !serverIds.includes(id));
        requireServerAuthority(session, [...added, ...removed]);
      }

      const updatedGroup = await withAudit(
        (tx) =>
          tx.groups.update({
            where: { id: groupId, deletedAt: null },
            data: {
              name: input.name,
              description: input.description,
              public: input.public,
              shareRecords: input.shareRecords,
              // Relations are only replaced when the caller sends them
              ...((added.length > 0 || removed.length > 0) && {
                groupServers: {
                  deleteMany: { serverId: { in: removed } },
                  create: added.map((serverId) => ({ serverId })),
                },
              }),
              ...(input.groupMembers && {
                groupMembers: {
                  deleteMany: {},
                  create: input.groupMembers.map((gm) => ({
                    role: gm.role,
                    userId: gm.userId,
                    order: gm.order,
                    serversOrder: gm.serversOrder,
                  })),
                },
              }),
            },
            include: groupUsersServersSchema,
          }),
        () => [session.user.id, groupId, "group.edit", input],
      );
      // Servers that joined or left the group may change theme
      if (updatedGroup.theme !== null)
        await publishThemeChange([
          ...previousServers,
          ...updatedGroup.groupServers.map((gs) => gs.serverId),
        ]);

      return updatedGroup;
    },
  );
}

async function activeGroupServerIds(groupId: string): Promise<string[]> {
  const rows = await getClient().groupServers.findMany({
    where: { groupId, server: { deletedAt: null } },
    select: { serverId: true },
  });
  return rows.map((row) => row.serverId);
}

function uniqueServerIds(groupServers?: { serverId: string }[]): string[] {
  return [...new Set((groupServers ?? []).map((gs) => gs.serverId))];
}

function requireServerAuthority(session: Session, serverIds: string[]) {
  const denied = serverIds.filter(
    (serverId) =>
      !hasPermissionSync(
        session,
        ["servers:edit", ...serverPermissions.admin],
        serverId,
      ),
  );
  if (denied.length > 0) {
    throw new ServerError(
      "You can only add or remove servers you administer",
      "Unauthorized",
    );
  }
}

export async function deleteGroup(groupId: string): Promise<ServerResponse> {
  assertResourceId(groupId);
  return doServerActionWithAuth(
    ["groups:delete", `groups:${groupId}:admin`],
    async (session) => {
      const group = await withAudit(
        (tx) =>
          tx.groups.update({
            where: { id: groupId },
            data: {
              deletedAt: new Date(),
            },
          }),
        () => [session.user.id, groupId, "group.delete"],
      );
      if (group.theme !== null)
        await publishThemeChange(await groupServerIds(groupId));
    },
  );
}

export async function updateGroupOrder(
  groups: UserGroup[],
): Promise<ServerResponse> {
  return doServerActionWithAuth([], async (session) => {
    const db = getClient();

    const userId = session.user.id;

    await Promise.all(
      groups.map((group) =>
        db.groupMember.update({
          where: {
            userId_groupId: {
              userId,
              groupId: group.id,
            },
          },
          data: {
            order: group.order,
          },
        }),
      ),
    );
  });
}

export async function updateGroupServersOrder(
  groupId: string,
  serverIdsInOrder: string[],
): Promise<ServerResponse> {
  assertResourceId(groupId);
  return doServerActionWithAuth([], async (session) => {
    const meta = {
      type: "database",
      module: "groups",
      function: "updateGroupServersOrder",
    };

    const db = getClient();

    const userId = session.user.id;

    const groupMember = await db.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    if (!groupMember) {
      logger.warn(
        { meta, userId, groupId },
        "User is not a member of the group",
      );
      throw new ServerError(
        "User is not a member of the group",
        "GroupMemberNotFound",
      );
    }

    await db.groupMember.update({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
      data: {
        serversOrder: serverIdsInOrder.join(","),
      },
    });
  });
}
