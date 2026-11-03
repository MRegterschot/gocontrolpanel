import type { ErrorCode, ServerClient } from "@tmcontrolpanel/shared";
import type { ServerEventMap } from "../server/server-events";

// Redis keys and channels shared by fronts and workers
export const clusterKeys = {
  lease: (serverId: string) => `gbx:lease:${serverId}`,
  leasePattern: "gbx:lease:*",
  singleton: (name: string) => `gbx:singleton:${name}`,
  worker: (workerId: string) => `gbx:worker:${workerId}`,
  workerPattern: "gbx:worker:*",
  status: (serverId: string) => `gbx:status:${serverId}`,
  statusPattern: "gbx:status:*",
  rpc: (workerId: string) => `gbx:rpc:${workerId}`,
  reply: (frontId: string) => `gbx:reply:${frontId}`,
  serverEvents: (serverId: string) => `gbx:ev:${serverId}`,
  globalEvents: "gbx:ev:global",
};

// Lease, status and pub/sub primitives; Redis in production, in memory in tests
export interface ClusterStore {
  // Lease keys hold the owner id; renew and release only act while the owner still matches
  claim(key: string, owner: string, ttlMs: number): Promise<boolean>;
  renew(key: string, owner: string, ttlMs: number): Promise<boolean>;
  release(key: string, owner: string): Promise<boolean>;
  owners(keys: string[]): Promise<(string | null)[]>;
  // Drops every lease held by the owner, with its status entry; returns the server ids
  releaseServersOwnedBy(owner: string): Promise<string[]>;

  heartbeat(workerId: string, ttlMs: number): Promise<void>;
  dropWorker(workerId: string): Promise<void>;
  liveWorkers(): Promise<string[]>;

  writeStatus(status: ServerClient, ttlMs: number): Promise<void>;
  dropStatus(serverId: string): Promise<void>;
  readStatus(serverId: string): Promise<ServerClient | null>;
  listStatus(): Promise<ServerClient[]>;

  // Resolves to the number of subscribers that received the message
  publish(channel: string, message: string): Promise<number>;
  // Resolves once the subscription is active
  subscribe(
    channel: string,
    handler: (message: string) => void,
  ): Promise<() => Promise<void>>;
  ping(): Promise<boolean>;
}

export interface RpcRequest {
  id: string;
  op: string;
  serverId: string;
  args: unknown;
  replyTo: string;
}

export type RpcReply =
  | { id: string; ok: true; data: unknown }
  // notOwner: delivered but not run, because the worker doesn't own the server (safe to retry)
  | {
      id: string;
      ok: false;
      code: ErrorCode;
      message: string;
      notOwner?: boolean;
    };

// Runtime events that the browser sockets forward; workers publish these per server
export const forwardedServerEvents = [
  "live-finish",
  "personalBest",
  "live-checkpoint",
  "beginRound",
  "live-endRound",
  "beginMap",
  "endMap",
  "startMap",
  "beginMatch",
  "live-giveUp",
  "warmUpStart",
  "warmUpEnd",
  "warmUpStartRound",
  "playerInfoChanged",
  "playerConnectInfo",
  "playerDisconnectInfo",
  "updatedSettings",
  "elimination",
  "playerUpdated",
  "teamUpdated",
  "playerChat",
  "playerConnect",
  "playerDisconnect",
  "playerInfo",
  "playerList",
] as const satisfies readonly (keyof ServerEventMap)[];

export type ForwardedServerEvent = (typeof forwardedServerEvents)[number];

export interface ServerEventMessage {
  event: ForwardedServerEvent;
  args: unknown[];
}

// Cross-server events every front listens to
export type GlobalEventMessage =
  | { event: "connect" | "disconnect"; serverId: string }
  | {
      event: "reconnect";
      serverId: string;
      type: "try" | "stop";
      time: number | null;
    }
  | { event: "adminCommand"; serverId: string; notifications: unknown[] }
  // A worker took over a server, released it, or disposed it because the server was deleted
  | {
      event: "owned" | "released" | "removed";
      serverId: string;
      workerId: string;
    };
