import {
  canViewServer,
  getAccessibleServers,
  getAdminServerIds,
  hasPermission,
  type LiveSnapshot,
  serverPermissions,
  type SessionClaims,
  type WsMessage,
} from "@tmcontrolpanel/shared";
import type { ServerGateway } from "../../core/cluster/gateway";
import type { ForwardedServerEvent } from "../../core/cluster/protocol";
import { AppError } from "../../core/errors";
import type { ServerEventMap } from "../../core/server/server-events";

export const CloseCode = {
  // The socket reached its lifetime; the client reconnects with a fresh ticket
  Reauthenticate: 4001,
  Unauthorized: 4401,
  Forbidden: 4403,
  NotFound: 4404,
} as const;

export interface ChannelInput {
  claims: SessionClaims;
  params: Record<string, string>;
  gateway: ServerGateway;
  send: (message: WsMessage<string, unknown>) => void;
  close: (code: number, reason: string) => void;
}

export type ChannelResult =
  | { ok: true; cleanup: () => void }
  | { ok: false; code: number; reason: string };

export interface ChannelDefinition {
  path: string;
  open(input: ChannelInput): Promise<ChannelResult>;
}

const denied = (code: number, reason: string): ChannelResult => ({
  ok: false,
  code,
  reason,
});

function combine(cleanups: (() => void)[]): () => void {
  return () => cleanups.forEach((cleanup) => cleanup());
}

// Access rules, kept pure so they can be tested on their own
export const access = {
  serversChannelIds: (claims: SessionClaims) => getAccessibleServers(claims),
  notificationServerIds: (claims: SessionClaims) => getAdminServerIds(claims),
  canViewServer,
  canViewPlayers: (claims: SessionClaims, serverId: string) =>
    hasPermission(claims, serverPermissions.moderator, serverId),
};

const serversChannel: ChannelDefinition = {
  path: "/ws/servers",
  async open({ claims, gateway, send }) {
    const servers = access.serversChannelIds(claims);
    const ids = new Set(servers.map((s) => s.id));
    const connected = new Set(
      (await gateway.list())
        .filter((s) => s.isConnected)
        .map((s) => s.serverId),
    );

    send({
      type: "servers",
      data: servers.map((server) => ({
        id: server.id,
        name: server.name,
        hasFileManager: server.hasFileManager ?? false,
        isConnected: connected.has(server.id),
      })),
    });

    return {
      ok: true,
      cleanup: combine([
        gateway.events.on("connect", (serverId) => {
          if (ids.has(serverId)) send({ type: "connect", data: { serverId } });
        }),
        gateway.events.on("disconnect", (serverId) => {
          if (ids.has(serverId))
            send({ type: "disconnect", data: { serverId } });
        }),
        gateway.events.on("handover", (event) => {
          if (ids.has(event.serverId)) send({ type: "handover", data: event });
        }),
      ]),
    };
  },
};

const notificationsChannel: ChannelDefinition = {
  path: "/ws/notifications",
  async open({ claims, gateway, send }) {
    const adminServers = access.notificationServerIds(claims);

    return {
      ok: true,
      cleanup: gateway.events.on("adminCommand", (serverId, notifications) => {
        if (!adminServers.has(serverId)) return;
        const own = notifications.find((n) => n.userId === claims.id);
        if (own) send({ type: "adminCommand", data: own });
      }),
    };
  },
};

// Internal event -> wire message for the live dashboard
const liveForwards: Forwards = {
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
  playerInfoChanged: (round) => ({
    type: "playerInfoChanged",
    data: { round },
  }),
  playerConnectInfo: (live) => ({ type: "playerConnect", data: { live } }),
  playerDisconnectInfo: (round) => ({
    type: "playerDisconnect",
    data: { round },
  }),
  updatedSettings: (info) => ({ type: "updatedSettings", data: { info } }),
  elimination: (info) => ({ type: "elimination", data: { info } }),
  playerUpdated: (round) => ({ type: "playerUpdated", data: { round } }),
  teamUpdated: (team) => ({ type: "teamUpdated", data: { team } }),
  playerChat: (chat) => ({ type: "playerChat", data: { chat } }),
};

type Forwards = {
  [K in ForwardedServerEvent]?: (
    ...args: ServerEventMap[K]
  ) => WsMessage<string, unknown>;
};

// Streams one server's events. The snapshot is fetched after subscribing and events are held
// back until it arrives, so nothing falls between the two; a new owner sends a fresh snapshot.
function serverChannel(
  path: string,
  authorize: (claims: SessionClaims, serverId: string) => boolean,
  initial: (snapshot: LiveSnapshot) => WsMessage<string, unknown>,
  forwards: Forwards,
): ChannelDefinition {
  return {
    path,
    async open({ claims, params, gateway, send, close }) {
      const serverId = params.id;
      if (!serverId || !authorize(claims, serverId)) {
        return denied(CloseCode.Forbidden, "Not allowed to view this server");
      }

      let buffer: [ForwardedServerEvent, unknown[]][] | null = [];
      let closed = false;
      const deliver = (event: ForwardedServerEvent, args: unknown[]) => {
        const toMessage = forwards[event] as
          | ((...a: unknown[]) => WsMessage<string, unknown>)
          | undefined;
        if (toMessage) send(toMessage(...args));
      };

      let stopWatching: () => void;
      try {
        stopWatching = await gateway.watch(serverId, (event, args) => {
          if (buffer) buffer.push([event, args]);
          else deliver(event, args);
        });
      } catch (error) {
        if (error instanceof AppError && error.code === "ServerNotFound") {
          return denied(
            CloseCode.NotFound,
            "Server is not managed by this service",
          );
        }
        throw error;
      }

      const sync = async () => {
        buffer ??= [];
        try {
          const snapshot = await gateway.call(serverId, "snapshot");
          if (!closed) send(initial(snapshot));
        } catch (error) {
          // No owner right now (failover); the "owned" event triggers another sync
          if (
            !(error instanceof AppError) ||
            error.code !== "ServerUnavailable"
          )
            throw error;
        } finally {
          const held = buffer ?? [];
          buffer = null;
          if (!closed) held.forEach(([event, args]) => deliver(event, args));
        }
      };

      try {
        await sync();
      } catch (error) {
        stopWatching();
        throw error;
      }

      return {
        ok: true,
        cleanup: combine([
          () => (closed = true),
          stopWatching,
          gateway.events.on("owned", (owned) => {
            if (owned === serverId) void sync().catch(() => undefined);
          }),
          gateway.events.on("removed", (removed) => {
            if (removed === serverId) close(1001, "Server removed");
          }),
        ]),
      };
    },
  };
}

const liveChannel = serverChannel(
  "/ws/live/:id",
  access.canViewServer,
  (snapshot) => ({ type: "beginMatch", data: { info: snapshot.liveInfo } }),
  liveForwards,
);

const mapChannel = serverChannel(
  "/ws/map/:id",
  access.canViewServer,
  (snapshot) => ({ type: "activeMap", data: snapshot.activeMap ?? undefined }),
  {
    endMap: (mapUid) => ({ type: "endMap", data: { mapUid } }),
    startMap: (mapUid) => ({ type: "startMap", data: { mapUid } }),
  },
);

const playersChannel = serverChannel(
  "/ws/players/:id",
  access.canViewPlayers,
  (snapshot) => ({ type: "playerList", data: snapshot.activePlayers }),
  {
    playerConnect: (player) => ({ type: "playerConnect", data: player }),
    playerDisconnect: (login) => ({
      type: "playerDisconnect",
      data: { login },
    }),
    playerInfo: (player) => ({ type: "playerInfo", data: player }),
    playerList: (players) => ({ type: "playerList", data: players }),
  },
);

export const channels: ChannelDefinition[] = [
  serversChannel,
  notificationsChannel,
  liveChannel,
  mapChannel,
  playersChannel,
];
