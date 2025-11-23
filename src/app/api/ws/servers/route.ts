import { parseTokenFromRequest } from "@/lib/auth";
import {
  GbxClientManager,
  getGbxClientManager,
} from "@/lib/managers/gbxclient-manager";
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

  const allServers = token?.groups?.flatMap((group) => group.servers) || [];
  const servers = [
    ...new Map(allServers.map((server) => [server.id, server])).values(),
  ];

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
