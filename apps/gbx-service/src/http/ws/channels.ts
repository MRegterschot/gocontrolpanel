import {
  canViewServer,
  getAccessibleServers,
  getAdminServerIds,
  hasPermission,
  serverPermissions,
  type SessionClaims,
  type WsMessage,
} from "@gcp/shared";
import type { ServerRegistry } from "../../core/server/server-registry";
import type { ServerRuntime } from "../../core/server/server-runtime";
import type { ServerEventMap } from "../../core/server/server-events";

export const CloseCode = {
  Unauthorized: 4401,
  Forbidden: 4403,
  NotFound: 4404,
} as const;

export interface ChannelInput {
  claims: SessionClaims;
  params: Record<string, string>;
  registry: ServerRegistry;
  send: (message: WsMessage<string, unknown>) => void;
  close: (code: number, reason: string) => void;
}

export type ChannelResult =
  | { ok: true; cleanup: () => void }
  | { ok: false; code: number; reason: string };

export interface ChannelDefinition {
  path: string;
  open(input: ChannelInput): ChannelResult;
}

const denied = (code: number, reason: string): ChannelResult => ({ ok: false, code, reason });

function combine(cleanups: (() => void)[]): () => void {
  return () => cleanups.forEach((cleanup) => cleanup());
}

// Closes per-server sockets when the server is removed from the service
function closeOnRemoval(input: ChannelInput, serverId: string): () => void {
  return input.registry.events.on("runtimeRemoved", (removed) => {
    if (removed === serverId) input.close(1001, "Server removed");
  });
}

function forward<K extends keyof ServerEventMap>(
  runtime: ServerRuntime,
  event: K,
  toMessage: (...args: ServerEventMap[K]) => WsMessage<string, unknown>,
  send: ChannelInput["send"],
): () => void {
  return runtime.events.on(event, (...args) => send(toMessage(...args)));
}

// Access rules, kept pure so they can be tested on their own
export const access = {
  serversChannelIds: (claims: SessionClaims) => getAccessibleServers(claims),
  clientsScope(claims: SessionClaims): "all" | Set<string> {
    if (hasPermission(claims, ["servers:clients:view"])) return "all";
    return new Set(claims.servers.filter((s) => s.role === "Admin").map((s) => s.id));
  },
  notificationServerIds: (claims: SessionClaims) => getAdminServerIds(claims),
  canViewServer,
  canViewPlayers: (claims: SessionClaims, serverId: string) =>
    hasPermission(claims, serverPermissions.moderator, serverId),
};

const serversChannel: ChannelDefinition = {
  path: "/ws/servers",
  open({ claims, registry, send }) {
    const servers = access.serversChannelIds(claims);
    const ids = new Set(servers.map((s) => s.id));

    send({
      type: "servers",
      data: servers.map((server) => ({
        id: server.id,
        name: server.name,
        filemanagerUrl: server.filemanagerUrl ?? undefined,
        isConnected: registry.find(server.id)?.isConnected ?? false,
      })),
    });

    return {
      ok: true,
      cleanup: combine([
        registry.events.on("connect", (serverId) => {
          if (ids.has(serverId)) send({ type: "connect", data: { serverId } });
        }),
        registry.events.on("disconnect", (serverId) => {
          if (ids.has(serverId)) send({ type: "disconnect", data: { serverId } });
        }),
      ]),
    };
  },
};

const clientsChannel: ChannelDefinition = {
  path: "/ws/clients",
  open({ claims, registry, send }) {
    const scope = access.clientsScope(claims);
    const visible = (serverId: string) => scope === "all" || scope.has(serverId);

    send({
      type: "clients",
      data: registry
        .list()
        .filter((runtime) => visible(runtime.serverId))
        .map((runtime) => runtime.status()),
    });

    return {
      ok: true,
      cleanup: combine([
        registry.events.on("connect", (serverId) => {
          if (visible(serverId)) send({ type: "connect", data: { serverId } });
        }),
        registry.events.on("disconnect", (serverId) => {
          if (visible(serverId)) send({ type: "disconnect", data: { serverId } });
        }),
        registry.events.on("reconnect", (serverId, type, time) => {
          if (visible(serverId)) send({ type: "reconnect", data: { serverId, type, time } });
        }),
      ]),
    };
  },
};

const notificationsChannel: ChannelDefinition = {
  path: "/ws/notifications",
  open({ claims, registry, send }) {
    const adminServers = access.notificationServerIds(claims);

    return {
      ok: true,
      cleanup: registry.events.on("adminCommand", (serverId, notifications) => {
        if (!adminServers.has(serverId)) return;
        const own = notifications.find((n) => n.userId === claims.id);
        if (own) send({ type: "adminCommand", data: own });
      }),
    };
  },
};

// Internal event -> wire message for the live dashboard
const liveForwards: {
  [K in keyof ServerEventMap]?: (...args: ServerEventMap[K]) => WsMessage<string, unknown>;
} = {
  "live-finish": (round) => ({ type: "finish", data: { round } }),
  personalBest: (info) => ({ type: "personalBest", data: { info } }),
  "live-checkpoint": (round) => ({ type: "checkpoint", data: { round } }),
  beginRound: (round) => ({ type: "beginRound", data: { round } }),
  "live-endRound": (info) => ({ type: "endRound", data: { info } }),
  beginMap: (mapUid) => ({ type: "beginMap", data: { mapUid } }),
  endMap: (mapUid) => ({ type: "endMap", data: { mapUid } }),
  beginMatch: (info) => ({ type: "beginMatch", data: { info } }),
  "live-giveUp": (round) => ({ type: "giveUp", data: { round } }),
  warmUpStart: (info) => ({ type: "warmUpStart", data: { info } }),
  warmUpEnd: (info) => ({ type: "warmUpEnd", data: { info } }),
  warmUpStartRound: (info) => ({ type: "warmUpStartRound", data: { info } }),
  playerInfoChanged: (round) => ({ type: "playerInfoChanged", data: { round } }),
  playerConnectInfo: (live) => ({ type: "playerConnect", data: { live } }),
  playerDisconnectInfo: (round) => ({ type: "playerDisconnect", data: { round } }),
  updatedSettings: (info) => ({ type: "updatedSettings", data: { info } }),
  elimination: (info) => ({ type: "elimination", data: { info } }),
  playerUpdated: (round) => ({ type: "playerUpdated", data: { round } }),
  teamUpdated: (team) => ({ type: "teamUpdated", data: { team } }),
  playerChat: (chat) => ({ type: "playerChat", data: { chat } }),
};

function serverChannel(
  path: string,
  authorize: (claims: SessionClaims, serverId: string) => boolean,
  attach: (runtime: ServerRuntime, send: ChannelInput["send"]) => (() => void)[],
): ChannelDefinition {
  return {
    path,
    open(input) {
      const serverId = input.params.id;
      if (!serverId || !authorize(input.claims, serverId)) {
        return denied(CloseCode.Forbidden, "Not allowed to view this server");
      }

      const runtime = input.registry.find(serverId);
      if (!runtime) return denied(CloseCode.NotFound, "Server is not managed by this service");

      return {
        ok: true,
        cleanup: combine([...attach(runtime, input.send), closeOnRemoval(input, serverId)]),
      };
    },
  };
}

const liveChannel = serverChannel("/ws/live/:id", access.canViewServer, (runtime, send) => {
  send({ type: "beginMatch", data: { info: runtime.state.liveInfo } });
  return Object.entries(liveForwards).map(([event, toMessage]) =>
    forward(runtime, event as keyof ServerEventMap, toMessage as never, send),
  );
});

const mapChannel = serverChannel("/ws/map/:id", access.canViewServer, (runtime, send) => {
  send({ type: "activeMap", data: runtime.state.activeMapUid ?? undefined });
  return [
    forward(runtime, "endMap", (mapUid) => ({ type: "endMap", data: { mapUid } }), send),
    forward(runtime, "startMap", (mapUid) => ({ type: "startMap", data: { mapUid } }), send),
  ];
});

const playersChannel = serverChannel("/ws/players/:id", access.canViewPlayers, (runtime, send) => {
  send({ type: "playerList", data: runtime.state.activePlayers });
  return [
    forward(runtime, "playerConnect", (player) => ({ type: "playerConnect", data: player }), send),
    forward(runtime, "playerDisconnect", (login) => ({ type: "playerDisconnect", data: { login } }), send),
    forward(runtime, "playerInfo", (player) => ({ type: "playerInfo", data: player }), send),
    forward(runtime, "playerList", (players) => ({ type: "playerList", data: players }), send),
  ];
});

export const channels: ChannelDefinition[] = [
  serversChannel,
  clientsChannel,
  notificationsChannel,
  liveChannel,
  mapChannel,
  playersChannel,
];
