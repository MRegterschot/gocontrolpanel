import { parseTokenFromRequest } from "@/lib/auth";
import { getClient } from "@/lib/dbclient";
import { appGlobals } from "@/lib/global";
import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import { ServerClient } from "@/types/server";

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
  const globalClients = appGlobals.gbxClients
    ? Object.values(appGlobals.gbxClients)
    : [];

  const serverManagers: {
    manager: GbxClientManager;
    client: ServerClient;
  }[] = [];

  if (token.admin || token.permissions.includes("servers:clients:view")) {
    const serverIds = globalClients.map((client) => client.getServerId());

    const db = getClient();
    const servers = await db.servers.findMany({
      where: {
        id: { in: serverIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const serverMap = new Map(servers.map((s) => [s.id, s.name]));

    for (const client of globalClients) {
      serverManagers.push({
        manager: client,
        client: {
          serverId: client.getServerId(),
          name: serverMap.get(client.getServerId()) || "Unknown Server",
          isConnected: client.getIsConnected(),
          isReconnecting: client.getReconnectAt() !== null,
          reconnectingAt: client.getReconnectAt(),
        },
      });
    }
  } else {
    const userServerIds = token.servers
      .filter((s) => s.role === "Admin")
      .map((s) => s.id);

    if (userServerIds.length > 0) {
      const filteredClients = globalClients.filter((client) =>
        userServerIds.includes(client.getServerId()),
      );

      for (const client of filteredClients) {
        serverManagers.push({
          manager: client,
          client: {
            serverId: client.getServerId(),
            name:
              token.servers.find((s) => s.id === client.getServerId())?.name ||
              "Unknown Server",
            isConnected: client.getIsConnected(),
            isReconnecting: client.getReconnectAt() !== null,
            reconnectingAt: client.getReconnectAt(),
          },
        });
      }
    }
  }

  client.send(
    JSON.stringify({
      type: "clients",
      data: serverManagers.map((sm) => sm.client),
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
      reconnect: (serverId, type, time) => {
        client.send(
          JSON.stringify({ type: "reconnect", data: { serverId, type, time } }),
        );
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
