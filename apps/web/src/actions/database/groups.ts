"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { logger } from "@/lib/logger";
import {
  EditGroups,
  GroupsWithUsersWithServers,
  groupUsersServersSchema,
} from "@/services/database/groups";
import { UserGroup } from "@/types/auth";
import { ServerError, ServerResponse } from "@/types/responses";
import { logAudit } from "./server-only/audit-logs";
import { groupServerIds, publishThemeChange } from "./server-only/themes";

export async function createGroup(
  group: Omit<EditGroups, "id" | "createdAt" | "updatedAt" | "deletedAt">,
): Promise<ServerResponse<GroupsWithUsersWithServers>> {
  return doServerActionWithAuth(["groups:create"], async (session) => {
    const db = getClient();

    const { groupMembers, groupServers, ...groupData } = group;
    const newGroup = await db.groups.create({
      data: {
        ...groupData,
        groupServers: {
          create: groupServers.map((gs) => ({
            serverId: gs.serverId,
          })),
        },
        groupMembers: {
          create: groupMembers.map((gm) => ({
            role: gm.role,
            userId: gm.userId,
          })),
        },
      },
      include: groupUsersServersSchema,
    });

    await logAudit(session.user.id, newGroup.id, "group.create", group);

    return newGroup;
  });
}

export async function updateGroup(
  groupId: string,
  group: Partial<
    Omit<EditGroups, "id" | "createdAt" | "updatedAt" | "deletedAt">
  >,
): Promise<ServerResponse<GroupsWithUsersWithServers>> {
  return doServerActionWithAuth(
    ["groups:edit", `groups:${groupId}:admin`],
    async (session) => {
      const db = getClient();

      const { groupMembers, groupServers, ...scalarFields } = group;
      const previousServers = await groupServerIds(groupId);

      const updatedGroup = await db.groups.update({
        where: { id: groupId },
        data: {
          ...scalarFields,
          groupServers: {
            deleteMany: {},
            create: groupServers?.map((gs) => ({
              serverId: gs.serverId,
            })),
          },
          groupMembers: {
            deleteMany: {},
            create: groupMembers?.map((gm) => ({
              role: gm.role,
              userId: gm.userId,
              order: gm.order,
              serversOrder: gm.serversOrder,
            })),
          },
        },
        include: groupUsersServersSchema,
      });

      await logAudit(session.user.id, groupId, "group.edit", group);
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

export async function deleteGroup(groupId: string): Promise<ServerResponse> {
  return doServerActionWithAuth(
    ["groups:delete", `groups:${groupId}:admin`],
    async (session) => {
      const db = getClient();
      const group = await db.groups.update({
        where: { id: groupId },
        data: {
          deletedAt: new Date(),
        },
      });

      await logAudit(session.user.id, groupId, "group.delete");
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
