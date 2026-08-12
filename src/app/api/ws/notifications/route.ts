import { parseTokenFromRequest } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  GbxClientManager,
  getGbxClientManager,
} from "@/lib/managers/gbxclient-manager";
import { Notifications } from "@/lib/prisma/generated";

const meta = {
  type: "ws",
  module: "notifications",
};

export function GET() {
  const headers = new Headers();
  headers.set("Connection", "Upgrade");
  headers.set("Upgrade", "websocket");
  return new Response("Upgrade Required", { status: 426, headers });
}

export async function UPGRADE(
  client: import("ws").WebSocket,
  _server: import("ws").WebSocketServer,
  request: import("next/server").NextRequest,
  _context: import("next-ws/server").RouteContext<"/api/ws/notifications">,
) {
  const token = await parseTokenFromRequest(request);

  if (!token) {
    client.close();
    return;
  }

  const servers = token?.groups?.flatMap((group) => group.servers) || [];
  const adminServers: string[] = token.groups?.flatMap((group) =>
    group.role === "Admin" ? group.servers.map((server) => server.id) : [],
  );

  token.servers.forEach((server) => {
    if (server.role === "Admin" && !adminServers.includes(server.id)) {
      adminServers.push(server.id);
    }
  });

  const serverManagers: GbxClientManager[] = [];

  for (const server of servers) {
    const manager = await getGbxClientManager(server.id);
    if (manager) {
      serverManagers.push(manager);
    }
  }

  const listenerId = crypto.randomUUID();

  logger.debug(
    { meta, listenerId },
    "Adding WebSocket listeners for notifications",
  );

  for (const manager of serverManagers) {
    manager.addListeners(listenerId, {
      adminCommand: (notifications: Notifications[]) => {
        const notification = notifications.find(
          (n) => n.serverId === manager.getServerId() && n.userId === token.id,
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

  client.once("close", () => {
    logger.debug(
      { meta, listenerId },
      "Cleaning up WebSocket listeners for notifications",
    );
    for (const manager of serverManagers) {
      manager.removeListeners(listenerId);
    }
  });
}
