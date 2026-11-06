import type {
  ErrorCode,
  HandoverEvent,
  ServerClient,
} from "@tmcontrolpanel/shared";
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
  // Admin park flag; no TTL, so it survives restarts of every process
  hold: (serverId: string) => `gbx:hold:${serverId}`,
  holdPattern: "gbx:hold:*",
  // Short-lived hint telling one worker to claim this server next
  assign: (serverId: string) => `gbx:assign:${serverId}`,
  // Cluster control messages (claim passes, worker restarts) for every worker and front
  control: "gbx:ctl",
  // Last worker that claimed the server, and the reason it gave when it let go cleanly
  lastOwner: (serverId: string) => `gbx:last-owner:${serverId}`,
  handover: (serverId: string) => `gbx:handover:${serverId}`,
};

// Written by the old owner on a clean release; a missing entry means it crashed
export type HandoverReason =
  | "move"
  | "hold"
  | "rebalance"
  | "shutdown"
  | "lease";

// Handled by the worker itself instead of the runtime: frees the server for another worker
export const RELEASE_OP = "release";

export interface WorkerInfo {
  nodeId: string;
  pid: number;
  startedAt: number;
}

export interface LeaseEntry {
  serverId: string;
  owner: string;
  ttlMs: number;
}

export type ControlMessage =
  | { action: "claim" }
  | { action: "restartWorker"; workerId: string };

// Lease, status and pub/sub primitives; Redis in production, in memory in tests
export interface ClusterStore {
  // Lease keys hold the owner id; renew and release only act while the owner still matches
  claim(key: string, owner: string, ttlMs: number): Promise<boolean>;
  renew(key: string, owner: string, ttlMs: number): Promise<boolean>;
  release(key: string, owner: string): Promise<boolean>;
  owners(keys: string[]): Promise<(string | null)[]>;
  // Drops every lease held by the owner, with its status entry; returns the server ids
  releaseServersOwnedBy(owner: string): Promise<string[]>;

  heartbeat(workerId: string, ttlMs: number, info?: WorkerInfo): Promise<void>;
  dropWorker(workerId: string): Promise<void>;
  liveWorkers(): Promise<string[]>;
  // Live workers with the info of their last heartbeat (null when sent without info)
  workers(): Promise<{ id: string; info: WorkerInfo | null }[]>;
  leases(): Promise<LeaseEntry[]>;

  // Plain flags (holds, assignments); ttlMs omitted means no expiry
  setFlag(key: string, value: string, ttlMs?: number): Promise<void>;
  deleteFlag(key: string): Promise<void>;
  heldServers(): Promise<string[]>;

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
    }
  | ({ event: "handover" } & HandoverEvent);
