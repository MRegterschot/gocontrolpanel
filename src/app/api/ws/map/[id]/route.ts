import { parseTokenFromRequest } from "@/lib/auth";
import { getGbxClientManager } from "@/lib/managers/gbxclient-manager";
import { parse } from "node:url";

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
  const { pathname } = parse(req.url || "", true);
  const parts = pathname?.split("/") || [];
  const id = parts[parts.length - 1];

  if (!id) {
    client.close();
    return;
  }

  const token = await parseTokenFromRequest(req);
  if (!token) {
    client.close();
    return;
  }

  const canView =
    token.admin ||
    token.servers.some((server) => server.id === id) ||
    token.groups.some((group) =>
      group.servers.some((server) => server.id === id),
    );

  if (!canView) {
    client.close();
    return;
  }

  const manager = await getGbxClientManager(id);

  client.send(
    JSON.stringify({
      type: "activeMap",
      data: manager.getActiveMap(),
    }),
  );

  const onEndMap = (mapUid: string) =>
    client.send(
      JSON.stringify({
        type: "endMap",
        data: { mapUid },
      }),
    );
  const onStartMap = (mapUid: string) =>
    client.send(
      JSON.stringify({
        type: "startMap",
        data: { mapUid },
      }),
    );

  const listenerId = crypto.randomUUID();

  manager.addListeners(listenerId, {
    endMap: onEndMap,
    startMap: onStartMap,
  });

  const cleanup = () => {
    manager.removeListeners(listenerId);
  };

  return () => {
    cleanup();
    client.close();
  };
}
