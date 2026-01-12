import { parseTokenFromRequest } from "@/lib/auth";
import { getGbxClientManager } from "@/lib/managers/gbxclient-manager";
import { ActiveRound, LiveInfo, PlayerRound } from "@/types/live";
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
      type: "beginMatch",
      data: { info: manager.info.liveInfo },
    }),
  );

  const onFinish = (round: ActiveRound) => {
    client.send(
      JSON.stringify({
        type: "finish",
        data: { round },
      }),
    );
  };

  const onPersonalBest = (info: LiveInfo) => {
    client.send(
      JSON.stringify({
        type: "personalBest",
        data: { info },
      }),
    );
  };

  const onCheckpoint = (round: ActiveRound) => {
    client.send(
      JSON.stringify({
        type: "checkpoint",
        data: { round },
      }),
    );
  };

  const onBeginRound = (round: ActiveRound) => {
    client.send(
      JSON.stringify({
        type: "beginRound",
        data: { round },
      }),
    );
  };

  const onEndRound = (info: LiveInfo) => {
    client.send(
      JSON.stringify({
        type: "endRound",
        data: { info },
      }),
    );
  };

  const onBeginMap = (mapUid: string) => {
    client.send(
      JSON.stringify({
        type: "beginMap",
        data: { mapUid },
      }),
    );
  };

  const onEndMap = (mapUid: string) => {
    client.send(
      JSON.stringify({
        type: "endMap",
        data: { mapUid },
      }),
    );
  };

  const onBeginMatch = (info: LiveInfo) => {
    client.send(
      JSON.stringify({
        type: "beginMatch",
        data: { info },
      }),
    );
  };

  const onGiveUp = (round: ActiveRound) => {
    client.send(
      JSON.stringify({
        type: "giveUp",
        data: { round },
      }),
    );
  };

  const onWarmUpStart = (info: LiveInfo) => {
    client.send(
      JSON.stringify({
        type: "warmUpStart",
        data: { info },
      }),
    );
  };

  const onWarmUpEnd = (info: LiveInfo) => {
    client.send(
      JSON.stringify({
        type: "warmUpEnd",
        data: { info },
      }),
    );
  };

  const onWarmUpStartRound = (info: LiveInfo) => {
    client.send(
      JSON.stringify({
        type: "warmUpStartRound",
        data: { info },
      }),
    );
  };

  const onPlayerInfoChanged = (round: ActiveRound) => {
    client.send(
      JSON.stringify({
        type: "playerInfoChanged",
        data: { round },
      }),
    );
  };

  const onPlayerConnect = (live: LiveInfo) => {
    client.send(
      JSON.stringify({
        type: "playerConnect",
        data: { live },
      }),
    );
  };

  const onPlayerDisconnect = (round: ActiveRound) => {
    client.send(
      JSON.stringify({
        type: "playerDisconnect",
        data: { round },
      }),
    );
  };

  const onUpdatedSettings = (info: LiveInfo) => {
    client.send(
      JSON.stringify({
        type: "updatedSettings",
        data: { info },
      }),
    );
  };

  const onElimination = (info: LiveInfo) => {
    client.send(
      JSON.stringify({
        type: "elimination",
        data: { info },
      }),
    );
  };

  const onPlayerUpdated = (round: PlayerRound) => {
    client.send(
      JSON.stringify({
        type: "playerUpdated",
        data: { round },
      }),
    );
  };

  const listenerId = crypto.randomUUID();

  manager.addListeners(listenerId, {
    "live-finish": onFinish,
    personalBest: onPersonalBest,
    "live-checkpoint": onCheckpoint,
    beginRound: onBeginRound,
    "live-endRound": onEndRound,
    beginMap: onBeginMap,
    endMap: onEndMap,
    beginMatch: onBeginMatch,
    "live-giveUp": onGiveUp,
    warmUpStart: onWarmUpStart,
    warmUpEnd: onWarmUpEnd,
    warmUpStartRound: onWarmUpStartRound,
    playerInfoChanged: onPlayerInfoChanged,
    playerConnectInfo: onPlayerConnect,
    playerDisconnectInfo: onPlayerDisconnect,
    updatedSettings: onUpdatedSettings,
    elimination: onElimination,
    playerUpdated: onPlayerUpdated,
  });

  const cleanup = () => {
    manager.removeListeners(listenerId);
  };

  return () => {
    cleanup();
    client.close();
  };
}
