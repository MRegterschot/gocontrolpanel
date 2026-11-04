import { z } from "zod";
import type { ServerClient } from "./server";

// Why a server changed workers. "crashed": the old worker vanished without handing it over
export type HandoverKind =
  | "moved"
  | "restarted"
  | "resumed"
  | "lease"
  | "crashed";

export interface HandoverEvent {
  serverId: string;
  kind: HandoverKind;
  workerId: string;
  previous: string;
}

export interface ClusterWorker {
  id: string;
  nodeId: string;
  pid: number | null;
  startedAt: number | null;
  // Servers whose lease this worker holds
  servers: string[];
}

export interface ClusterServerState {
  serverId: string;
  owner: string | null;
  leaseTtlMs: number | null;
  // Parked by an admin: no worker claims it until the hold is lifted
  held: boolean;
  // Null while no worker runs the server
  status: ServerClient | null;
}

export interface ClusterOverview {
  // "single" is GBX_WORKERS=0: one process, no leases, no worker controls
  mode: "cluster" | "single";
  workers: ClusterWorker[];
  servers: ClusterServerState[];
}

export const clusterMoveBodySchema = z.object({ workerId: z.string().min(1) });
export const clusterClaimBodySchema = z.object({
  workerId: z.string().min(1).optional(),
});

export type ClusterCommand =
  | { action: "move"; serverId: string; workerId: string }
  | { action: "claim"; serverId: string; workerId?: string }
  | { action: "hold"; serverId: string }
  | { action: "unhold"; serverId: string }
  | { action: "restartWorker"; workerId: string };
