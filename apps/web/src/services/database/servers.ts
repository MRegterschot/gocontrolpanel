import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { getLogger } from "@/lib/logger";
import {
  PaginationResponse,
  ServerError,
  ServerResponse,
} from "@/types/responses";
import { Prisma, Servers } from "@gcp/db";
import { PaginationState } from "@tanstack/react-table";
import "server-only";

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

export const serversUsersSchema = Prisma.validator<Prisma.ServersInclude>()({
  userServers: {
    include: {
      user: true,
    },
  },
});

// Credentials never leave the server: edit forms leave them empty to keep the stored value
export const omitSecrets = Prisma.validator<Prisma.ServersOmit>()({
  password: true,
  filemanagerPassword: true,
});

export type ServersWithUsers = Prisma.ServersGetPayload<{
  include: typeof serversUsersSchema;
  omit: typeof omitSecrets;
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
        omit: omitSecrets,
      });

      return {
        data: servers,
        totalCount,
      };
    },
  );
}

export async function getServerChatConfig(
  serverId: string,
): Promise<
  ServerResponse<
    Pick<
      Servers,
      | "manualRouting"
      | "messageFormat"
      | "connectMessage"
      | "disconnectMessage"
      | "scriptNameChangeMessage"
      | "matchSettingsLoadedMessage"
      | "scriptSettingsSavedMessage"
      | "mapListChangeMessage"
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
        scriptNameChangeMessage: true,
        matchSettingsLoadedMessage: true,
        scriptSettingsSavedMessage: true,
        mapListChangeMessage: true,
      },
    });

    if (!server) {
      log.warn({ meta, serverId }, "Server not found");
      throw new ServerError("Server not found", "ServerNotFound");
    }

    return server;
  });
}
