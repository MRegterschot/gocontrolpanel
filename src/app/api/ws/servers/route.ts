import { parseTokenFromRequest } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  GbxClientManager,
  getGbxClientManager,
} from "@/lib/managers/gbxclient-manager";
import { MinimalServer } from "@/types/auth";
import { ServerInfo } from "@/types/server";

const meta = {
  type: "ws",
  module: "servers",
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
  _context: import("next-ws/server").RouteContext<"/api/ws/servers">,
) {
  const token = await parseTokenFromRequest(request);

  if (!token) {
    client.close();
    return;
  }

  const allServers = token?.groups?.flatMap((group) => group.servers) || [];
  const adminServers =
    token?.adminGroups?.flatMap((group) => group.servers) || [];

  // Unique servers from both groups and adminGroups, by server.id
  const serversMap: Record<string, MinimalServer> = {};
  for (const server of [...allServers, ...adminServers]) {
    serversMap[server.id] = server;
  }
  const servers = Object.values(serversMap);

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

  client.send(
    JSON.stringify({
      type: "servers",
      data: serverManagers.map((sm) => sm.server),
    }),
  );

  const listenerId = crypto.randomUUID();

  logger.debug({ meta, listenerId }, "Adding WebSocket listeners for servers");

  for (const { manager } of serverManagers) {
    manager.addListeners(listenerId, {
      connect: (serverId) => {
        client.send(JSON.stringify({ type: "connect", data: { serverId } }));
      },
      disconnect: (serverId) => {
        client.send(JSON.stringify({ type: "disconnect", data: { serverId } }));
      },
    });
  }

  client.once("close", () => {
    logger.debug(
      { meta, listenerId },
      "Cleaning up WebSocket listeners for servers",
    );

    for (const { manager } of serverManagers) {
      manager.removeListeners(listenerId);
    }
  });
}
