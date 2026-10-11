"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import {
  chatConfigInput,
  createServerInput,
  parseInput,
  updateServerInput,
} from "@/lib/admin-inputs";
import { saveChatConfig } from "@/lib/chat-config";
import { getClient } from "@/lib/dbclient";
import { gbxService, publishServerEvent } from "@/lib/gbx-service";
import { getLogger } from "@/lib/logger";
import {
  getKeyHetznerRecentlyCreatedServers,
  getRedisClient,
} from "@/lib/redis";
import {
  EditServers,
  ServersWithUsers,
  omitSecrets,
  serversUsersSchema,
} from "@/services/database/servers";
import { HetznerServerCache } from "@/types/api/hetzner/servers";
import { ServerError, ServerResponse } from "@/types/responses";
import { Servers } from "@gcp/db";
import { logAudit } from "./server-only/audit-logs";

function redactSecrets<
  T extends { password?: string; filemanagerPassword?: string | null },
>(server: T) {
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

    const input = parseInput(createServerInput, server);
    const newServer = await db.servers.create({
      data: {
        name: input.name,
        description: input.description ?? "",
        host: input.host,
        port: input.port,
        user: input.user,
        password: input.password,
        filemanagerUrl: input.filemanagerUrl || null,
        filemanagerPassword: input.filemanagerPassword || null,
        userServers: {
          create: (input.userServers ?? []).map((us) => ({
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
      redactSecrets(input),
    );
    await publishServerEvent({
      type: "server.created",
      serverId: newServer.id,
    });

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
      | "deletedAt"
    >
  >,
): Promise<ServerResponse<ServersWithUsers>> {
  return doServerActionWithAuth(
    ["servers:edit", `servers:${serverId}:admin`],
    async (session) => {
      const db = getClient();
      const input = parseInput(updateServerInput, server);

      const original = await db.servers.findFirst({
        where: { id: serverId, deletedAt: null },
        select: { filemanagerUrl: true, filemanagerPassword: true },
      });
      if (!original) {
        throw new ServerError("Server not found", "ServerNotFound");
      }

      // The stored file manager token only ever goes to the origin it was saved for
      const filemanagerUrl =
        input.filemanagerUrl === undefined
          ? undefined
          : input.filemanagerUrl || null;
      if (
        filemanagerUrl &&
        !input.filemanagerPassword &&
        original.filemanagerPassword &&
        !sameOrigin(filemanagerUrl, original.filemanagerUrl)
      ) {
        throw new ServerError(
          "Enter the file manager password again when changing its URL",
          "FileManagerPasswordRequired",
        );
      }

      const updatedServer = await db.servers.update({
        where: { id: serverId },
        data: {
          name: input.name,
          description: input.description,
          host: input.host,
          port: input.port,
          user: input.user,
          // An empty password keeps the stored one
          ...(input.password && { password: input.password }),
          filemanagerUrl,
          ...(input.filemanagerPassword && {
            filemanagerPassword: input.filemanagerPassword,
          }),
          ...(filemanagerUrl === null && { filemanagerPassword: null }),
          // Memberships are only replaced when the caller sends them
          ...(input.userServers && {
            userServers: {
              deleteMany: {},
              create: input.userServers.map((us) => ({
                userId: us.userId,
                role: us.role,
              })),
            },
          }),
        },
        include: serversUsersSchema,
        omit: omitSecrets,
      });

      await logAudit(
        session.user.id,
        serverId,
        "server.edit",
        redactSecrets(input),
      );
      await publishServerEvent({ type: "server.updated", serverId });

      return updatedServer;
    },
  );
}

function sameOrigin(next: string, previous: string | null): boolean {
  if (!previous) return false;
  try {
    return new URL(next).origin === new URL(previous).origin;
  } catch {
    return false;
  }
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
): Promise<ServerResponse<Omit<Servers, "password" | "filemanagerPassword">>> {
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
      const input = parseInput(chatConfigInput, chatConfig);
      const { server, applied, error } = await saveChatConfig(input, {
        save: (data) =>
          db.servers.update({
            where: { id: serverId },
            data,
            omit: omitSecrets,
          }),
        apply: (config) => gbxService.applyChatConfig(serverId, config),
        notifyUpdated: () =>
          publishServerEvent({ type: "server.updated", serverId }),
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
