import { parseTokenFromRequest } from "@/lib/auth";
import { getClient } from "@/lib/dbclient";
import {
  GbxClientManager,
  getGbxClientManager,
} from "@/lib/managers/gbxclient-manager";
import { Notifications } from "@/lib/prisma/generated";
import { ServerInfo } from "@/types/server";

export function GET() {
  const headers = new Headers();
  headers.set("Connection", "Upgrade");
  headers.set("Upgrade", "websocket");
  return new Response("Upgrade Required", { status: 426, headers });
}

export async function SOCKET(
  client: import("ws").WebSocket,
  req: import("node:http").IncomingMessage,
) {
  const token = await parseTokenFromRequest(req);

  if (!token) {
    client.close();
    return;
  }

  const db = getClient();

  const servers = token?.groups?.flatMap((group) => group.servers) || [];
  const adminServers: string[] = token.groups?.flatMap((group) =>
    group.role === "Admin" ? group.servers.map((server) => server.id) : [],
  );

  token.servers.forEach((server) => {
    if (server.role === "Admin" && !adminServers.includes(server.id)) {
      adminServers.push(server.id);
    }
  });

  const serverManagers: {
    manager: GbxClientManager;
    server: ServerInfo;
  }[] = [];

  for (const server of servers) {
    const manager = await getGbxClientManager(server.id);
    if (manager) {
      serverManagers.push({
        manager,
        server: {
          id: server.id,
          name: server.name,
          filemanagerUrl: server.filemanagerUrl || undefined,
          isConnected: manager.getIsConnected(),
        },
      });
    }
  }

  const listenerId = crypto.randomUUID();

  for (const { manager, server } of serverManagers) {
    manager.addListeners(listenerId, {
      adminCommand: (notifications: Notifications[]) => {
        const notification = notifications.find(
          (n) => n.serverId === server.id && n.userId === token.id,
        );

        if (!notification) return;

        if (
          notification.serverId !== null &&
          adminServers.includes(notification.serverId)
        ) {
          client.send(
            JSON.stringify({
              type: "adminCommand",
              data: notification,
            }),
          );
        }
      },
    });
  }

  const cleanup = () => {
    for (const { manager } of serverManagers) {
      manager.removeListeners(listenerId);
    }
  };

  return () => {
    cleanup();
    client.close();
  };
}
