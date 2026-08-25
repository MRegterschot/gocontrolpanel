import { parseTokenFromRequest } from "@/lib/auth";
import { getLogger } from "@/lib/logger";
import { getGbxClientManager } from "@/lib/managers/gbxclient-manager";
import { hasPermissionsJWTSync } from "@/lib/permissions";
import { routePermissions } from "@/routes";
import { PlayerInfo } from "@/types/player";

const meta = {
  type: "ws",
  module: "players",
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
  context: import("next-ws/server").RouteContext<"/api/ws/players/[id]">,
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

  const canView = hasPermissionsJWTSync(
    token,
    routePermissions.servers.players,
    id,
  );
  if (!canView) {
    client.close();
    return;
  }

  const manager = await getGbxClientManager(id);

  client.send(
    JSON.stringify({
      type: "playerList",
      data: manager.info.activePlayers,
    }),
  );

  const onPlayerConnect = (playerInfo: PlayerInfo) =>
    client.send(
      JSON.stringify({
        type: "playerConnect",
        data: playerInfo,
      }),
    );

  const onPlayerDisconnect = (login: string) =>
    client.send(
      JSON.stringify({
        type: "playerDisconnect",
        data: { login },
      }),
    );

  const onPlayerInfo = (playerInfo: PlayerInfo) =>
    client.send(
      JSON.stringify({
        type: "playerInfo",
        data: playerInfo,
      }),
    );

  const onPlayerList = (players: PlayerInfo[]) =>
    client.send(
      JSON.stringify({
        type: "playerList",
        data: players,
      }),
    );

  const listenerId = crypto.randomUUID();

  logger.debug({ meta, listenerId }, "Adding WebSocket listeners for players");

  manager.addListeners(listenerId, {
    playerConnect: onPlayerConnect,
    playerDisconnect: onPlayerDisconnect,
    playerInfo: onPlayerInfo,
    playerList: onPlayerList,
  });

  client.once("close", () => {
    logger.debug(
      { meta, listenerId },
      "Cleaning up WebSocket listeners for players",
    );
    manager.removeListeners(listenerId);
  });
}
