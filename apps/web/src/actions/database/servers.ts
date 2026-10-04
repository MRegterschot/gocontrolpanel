"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { getLogger } from "@/lib/logger";
import { saveChatConfig } from "@/lib/chat-config";
import { gbxService, publishServerEvent } from "@/lib/gbx-service";
import { updateFileManager } from "@/lib/managers/file-manager";
import { Servers } from "@tmcp/db";
import {
  getKeyHetznerRecentlyCreatedServers,
  getRedisClient,
} from "@/lib/redis";
import { HetznerServerCache } from "@/types/api/hetzner/servers";
import { ServerError, ServerResponse } from "@/types/responses";
import { logAudit } from "./server-only/audit-logs";
import { EditServers, ServersWithUsers, omitSecrets, serversUsersSchema } from "@/services/database/servers";

function redactSecrets<T extends { password?: string; filemanagerPassword?: string | null }>(
  server: T,
) {
  return {
    ...server,
    ...(server.password && { password: "[redacted]" }),
    ...(server.filemanagerPassword && { filemanagerPassword: "[redacted]" }),
  };
}

export async function createServer(
  server: Omit<
    EditServers,
    | "id"
    | "manualRouting"
    | "messageFormat"
    | "connectMessage"
    | "disconnectMessage"
    | "scriptNameChangeMessage"
    | "matchSettingsLoadedMessage"
    | "scriptSettingsSavedMessage"
    | "mapListChangeMessage"
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
      omit: omitSecrets,
    });

    await logAudit(
      session.user.id,
      newServer.id,
      "server.create",
      redactSecrets(server),
    );
    await publishServerEvent({ type: "server.created", serverId: newServer.id });

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
      | "scriptNameChangeMessage"
      | "matchSettingsLoadedMessage"
      | "scriptSettingsSavedMessage"
      | "mapListChangeMessage"
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

      // An empty password keeps the stored one
      const { userServers, password, filemanagerPassword, ...rest } = server;
      const scalarFields = {
        ...rest,
        ...(password && { password }),
        ...(filemanagerPassword && { filemanagerPassword }),
      };
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
        omit: omitSecrets,
      });

      let filemanagerUrlChanged =
        scalarFields.filemanagerUrl !== originalServer?.filemanagerUrl;
      if (!filemanagerUrlChanged && !scalarFields.filemanagerUrl) {
        filemanagerUrlChanged = false;
      }

      const filemanagerPasswordChanged =
        !!filemanagerPassword &&
        filemanagerPassword !== originalServer?.filemanagerPassword;

      if (filemanagerUrlChanged || filemanagerPasswordChanged) {
        await updateFileManager(
          serverId,
          scalarFields.filemanagerUrl,
          filemanagerPassword || originalServer?.filemanagerPassword || undefined,
        );
      }

      await logAudit(
        session.user.id,
        serverId,
        "server.edit",
        redactSecrets(server),
      );
      await publishServerEvent({ type: "server.updated", serverId });

      return updatedServer;
    },
  );
}

export async function updateServerChatConfig(
  serverId: string,
  chatConfig: Pick<
    Servers,
    | "manualRouting"
    | "messageFormat"
    | "connectMessage"
    | "disconnectMessage"
    | "scriptNameChangeMessage"
    | "matchSettingsLoadedMessage"
    | "scriptSettingsSavedMessage"
    | "mapListChangeMessage"
  >,
): Promise<
  ServerResponse<Omit<Servers, "password" | "filemanagerPassword">>
> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async (session) => {
      const meta = {
        type: "database",
        module: "servers",
        function: "updateServerChatConfig",
      };
      const log = getLogger(serverId);

      const db = getClient();
      const { server, applied, error } = await saveChatConfig(chatConfig, {
        save: (data) =>
          db.servers.update({ where: { id: serverId }, data, omit: omitSecrets }),
        apply: (config) => gbxService.applyChatConfig(serverId, config),
        notifyUpdated: () => publishServerEvent({ type: "server.updated", serverId }),
        log,
      });

      await logAudit(
        session.user.id,
        serverId,
        "server.plugins.chat.edit",
        applied,
        error,
      );

      if (error) {
        log.error({ meta, error }, "Failed to update chat config on server");
        throw new ServerError(error, "UpdateChatConfigError");
      }

      return server;
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
      await publishServerEvent({ type: "server.deleted", serverId });

      await logAudit(session.user.id, serverId, "server.delete");
    },
  );
}
