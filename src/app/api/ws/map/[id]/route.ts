import { parseTokenFromRequest } from "@/lib/auth";
import { bindServerEvents } from "@/lib/events/bind";
import { getLogger } from "@/lib/logger";
import { getGbxClientManager } from "@/lib/managers/gbxclient-manager";

const meta = {
  type: "ws",
  module: "map",
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
  context: import("next-ws/server").RouteContext<"/api/ws/map/[id]">,
) {
  const { id } = context.params;

  if (!id) {
    client.close();
    return;
  }

  const logger = getLogger(id);

  const token = await parseTokenFromRequest(request);
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

  logger.debug({ meta, listenerId }, "Adding WebSocket listeners for map");

  const unbind = await bindServerEvents(manager, listenerId, {
    endMap: onEndMap,
    startMap: onStartMap,
  });

  client.once("close", () => {
    logger.debug(
      { meta, listenerId },
      "Cleaning up WebSocket listeners for map",
    );
    unbind();
  });
}
