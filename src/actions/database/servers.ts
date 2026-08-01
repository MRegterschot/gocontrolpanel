"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { getLogger } from "@/lib/logger";
import { updateFileManager } from "@/lib/managers/file-manager";
import {
  deleteGbxClientManager,
  getGbxClientManager,
} from "@/lib/managers/gbxclient-manager";
import { Prisma, Servers } from "@/lib/prisma/generated";
import {
  getKeyHetznerRecentlyCreatedServers,
  getRedisClient,
} from "@/lib/redis";
import { getErrorMessage } from "@/lib/utils";
import { HetznerServerCache } from "@/types/api/hetzner/servers";
import { PaginationResponse, ServerError, ServerResponse } from "@/types/responses";
import { PaginationState } from "@tanstack/react-table";
import { logAudit } from "./server-only/audit-logs";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const editServer = Prisma.validator<Prisma.ServersInclude>()({
  userServers: {
    select: {
      userId: true,
      role: true,
    },
  },
});

export type EditServers = Prisma.ServersGetPayload<{
  include: typeof editServer;
}>;

const serversUsersSchema = Prisma.validator<Prisma.ServersInclude>()({
  userServers: {
    include: {
      user: true,
    },
  },
});

export type ServersWithUsers = Prisma.ServersGetPayload<{
  include: typeof serversUsersSchema;
}>;

export type ServerMinimal = Pick<Servers, "id" | "name">;

export async function getServersMinimal(): Promise<
  ServerResponse<ServerMinimal[]>
> {
  return doServerActionWithAuth(
    ["groups:create", "groups:edit", "groups::admin", "servers:view"],
    async (session) => {
      const db = getClient();

      const where: Prisma.ServersWhereInput = {
        deletedAt: null,
      };

      if (!session.user.admin) {
        const userServers = session.user.servers
          .filter((s) => s.role === "Admin")
          .map((s) => s.id);

        where.id = { in: userServers };
      }

      return await db.servers.findMany({
        where,
        select: {
          id: true,
          name: true,
        },
      });
    },
  );
}

export async function getServersPaginated(
  pagination: PaginationState,
  sorting: { field: string; order: "asc" | "desc" },
  filter?: string,
): Promise<ServerResponse<PaginationResponse<ServersWithUsers>>> {
  return doServerActionWithAuth(
    ["servers:view", "servers:create", "servers::moderator", "servers::admin"],
    async (session) => {
      const db = getClient();

      const where: Prisma.ServersWhereInput = {
        deletedAt: null,
        ...(filter && {
          name: { contains: filter },
        }),
      };

      if (
        !session.user.admin &&
        !session.user.permissions.includes("servers:view")
      ) {
        const userServerIds = session.user.servers
          .filter((s) => s.role === "Moderator" || s.role === "Admin")
          .map((s) => s.id);

        if (userServerIds.length === 0) {
          return {
            data: [],
            totalCount: 0,
          };
        }

        where.id = { in: userServerIds };
      }

      const totalCount = await db.servers.count({
        where,
      });

      const servers = await db.servers.findMany({
        skip: pagination.pageIndex * pagination.pageSize,
        take: pagination.pageSize,
        orderBy: { [sorting.field]: sorting.order },
        where,
        include: serversUsersSchema,
      });

      return {
        data: servers,
        totalCount,
      };
    },
  );
}

export async function createServer(
  server: Omit<
    EditServers,
    | "id"
    | "manualRouting"
    | "messageFormat"
    | "connectMessage"
    | "disconnectMessage"
    | "enableHelpCommand"
    | "createdAt"
    | "updatedAt"
    | "deletedAt"
  >,
  recentlyCreatedProjectId?: string,
): Promise<ServerResponse<ServersWithUsers>> {
  return doServerActionWithAuth(["servers:create"], async (session) => {
    const db = getClient();

    const { userServers, ...serverData } = server;
    const newServer = await db.servers.create({
      data: {
        ...serverData,
        userServers: {
          create: userServers.map((us) => ({
            userId: us.userId,
            role: us.role,
          })),
        },
      },
      include: serversUsersSchema,
    });

    await logAudit(session.user.id, newServer.id, "server.create", server);

    if (recentlyCreatedProjectId) {
      const client = await getRedisClient();
      const key = getKeyHetznerRecentlyCreatedServers(recentlyCreatedProjectId);

      const servers = await client.lrange(key, 0, -1);

      const updatedServers = servers
        .map((item) => JSON.parse(item))
        .filter((server: HetznerServerCache) => server.ip !== newServer.host);

      await client.del(key);
      if (updatedServers.length > 0) {
        await client.rpush(
          key,
          ...updatedServers.map((s) => JSON.stringify(s)),
        );
        await client.expire(key, 60 * 60 * 2); // Keep for 2 hours
      }
    }

    return newServer;
  });
}

export async function updateServer(
  serverId: string,
  server: Partial<
    Omit<
      EditServers,
      | "id"
      | "manualRouting"
      | "messageFormat"
      | "connectMessage"
      | "disconnectMessage"
      | "createdAt"
      | "updatedAt"
    >
  >,
): Promise<ServerResponse<ServersWithUsers>> {
  return doServerActionWithAuth(
    ["servers:edit", `servers:${serverId}:admin`],
    async (session) => {
      const db = getClient();

      // Get the original server data before the update
      const originalServer = await db.servers.findUnique({
        where: { id: serverId },
        select: {
          filemanagerUrl: true,
          filemanagerPassword: true,
        },
      });

      const { userServers, ...scalarFields } = server;
      const updatedServer = await db.servers.update({
        where: { id: serverId },
        data: {
          ...scalarFields,
          userServers: {
            deleteMany: {},
            create: userServers?.map((us) => ({
              userId: us.userId,
              role: us.role,
            })),
          },
        },
        include: serversUsersSchema,
      });

      let filemanagerUrlChanged =
        scalarFields.filemanagerUrl !== originalServer?.filemanagerUrl;
      if (!filemanagerUrlChanged && !scalarFields.filemanagerUrl) {
        filemanagerUrlChanged = false;
      }

      let filemanagerPasswordChanged =
        scalarFields.filemanagerPassword !==
        originalServer?.filemanagerPassword;

      if (
        !scalarFields.filemanagerPassword &&
        !originalServer?.filemanagerPassword
      ) {
        filemanagerPasswordChanged = false;
      }

      if (filemanagerUrlChanged || filemanagerPasswordChanged) {
        await updateFileManager(
          serverId,
          scalarFields.filemanagerUrl,
          scalarFields.filemanagerPassword,
        );
      }

      await logAudit(session.user.id, serverId, "server.edit", server);

      return updatedServer;
    },
  );
}

export async function getServerChatConfig(
  serverId: string,
): Promise<
  ServerResponse<
    Pick<
      Servers,
      "manualRouting" | "messageFormat" | "connectMessage" | "disconnectMessage"
    >
  >
> {
  return doServerActionWithAuth([`servers:${serverId}:admin`], async () => {
    const meta = {
      type: "database",
      module: "servers",
      function: "getServerChatConfig",
    };
    const log = getLogger(serverId);
    const db = getClient();

    const server = await db.servers.findUnique({
      where: { id: serverId },
      select: {
        manualRouting: true,
        messageFormat: true,
        connectMessage: true,
        disconnectMessage: true,
      },
    });

    if (!server) {
      log.warn({ meta, serverId }, "Server not found");
      throw new ServerError("Server not found", "ServerNotFound");
    }

    return server;
  });
}

export async function updateServerChatConfig(
  serverId: string,
  chatConfig: Pick<
    Servers,
    "manualRouting" | "messageFormat" | "connectMessage" | "disconnectMessage"
  >,
): Promise<ServerResponse<Servers>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async (session) => {
      const meta = {
        type: "database",
        module: "servers",
        function: "updateServerChatConfig",
      };
      const log = getLogger(serverId);
      const manager = await getGbxClientManager(serverId);
      let error;

      try {
        await manager.client.call(
          "ChatEnableManualRouting",
          chatConfig.manualRouting,
        );
      } catch (e) {
        error = e;
        chatConfig.manualRouting = false;
      }

      const db = getClient();
      const updatedServer = await db.servers.update({
        where: { id: serverId },
        data: { ...chatConfig },
      });

      manager.info.chat = chatConfig;

      await logAudit(
        session.user.id,
        serverId,
        "server.plugins.chat.edit",
        chatConfig,
        error ? getErrorMessage(error) : undefined,
      );

      if (error) {
        log.error({ meta, error }, "Failed to update chat config on server");
        throw error;
      }

      return updatedServer;
    },
  );
}

export async function deleteServer(serverId: string): Promise<ServerResponse> {
  return doServerActionWithAuth(
    ["servers:delete", `servers:${serverId}:admin`],
    async (session) => {
      const db = getClient();
      await db.servers.update({
        where: { id: serverId },
        data: { deletedAt: new Date() },
      });
      await deleteGbxClientManager(serverId);

      await logAudit(session.user.id, serverId, "server.delete");
    },
  );
}
