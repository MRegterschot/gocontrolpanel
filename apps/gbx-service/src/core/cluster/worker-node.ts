import {
  decodeServerLifecycleEvent,
  SERVER_EVENTS_CHANNEL,
  type HandoverKind,
  type ServerLifecycleEvent,
} from "@tmcontrolpanel/shared";
import { AppError, errorMessage } from "../errors";
import type { Logger } from "../logger";
import type { Clock } from "../ports";
import type { ServerRegistry } from "../server/server-registry";
import type { ServerRuntime } from "../server/server-runtime";
import { runOp } from "./ops";
import { OwnershipManager, type LossReason } from "./ownership";
import {
  clusterKeys,
  forwardedServerEvents,
  RELEASE_OP,
  type ClusterStore,
  type ControlMessage,
  type GlobalEventMessage,
  type HandoverReason,
  type RpcReply,
  type RpcRequest,
  type ServerEventMessage,
  type WorkerInfo,
} from "./protocol";

// Long enough to cover a deploy; the next owner reads and deletes it anyway
const HANDOVER_TTL_MS = 24 * 60 * 60 * 1000;

// In-game reason the old owner gives before it disconnects
const goodbye: Record<HandoverReason | "removed", string> = {
  move: "Moving to another worker, back in a few seconds",
  rebalance: "Moving to another worker, back in a few seconds",
  hold: "Paused by an admin",
  shutdown: "Controller restarting, back in a few seconds",
  lease: "Lost the cluster lease, another worker takes over",
  removed: "Server removed from TMControlPanel",
};

// What the new owner reports, by the reason the old owner left (or "crash" if it gave none)
const takeover: Record<
  HandoverReason | "crash",
  { kind: HandoverKind; note: string | null }
> = {
  move: { kind: "moved", note: "Took over from another worker." },
  rebalance: { kind: "moved", note: "Took over from another worker." },
  hold: { kind: "resumed", note: null },
  shutdown: {
    kind: "restarted",
    note: "Took over after a controller restart.",
  },
  lease: {
    kind: "lease",
    note: "Took over after the previous worker lost its Redis connection.",
  },
  crash: {
    kind: "crashed",
    note: "Recovered after a controller crash; the round in progress was not recorded.",
  },
};

const isHandoverReason = (value: unknown): value is HandoverReason =>
  typeof value === "string" && value in goodbye && value !== "removed";

export interface WorkerNodeOptions {
  workerId: string;
  registry: ServerRegistry;
  store: ClusterStore;
  listServers: () => Promise<string[]>;
  clock: Clock;
  log: Logger;
  ttlMs: number;
  info?: WorkerInfo;
  claimIntervalMs?: number;
  rebalanceIntervalMs?: number;
}

// One worker process: owns servers through leases, runs their commands and publishes their events
export class WorkerNode {
  readonly ownership: OwnershipManager;
  private readonly detach = new Map<string, () => void>();
  // Why an admin asked this worker to let a server go, read when the runtime is disposed
  private readonly releaseReasons = new Map<string, HandoverReason>();
  private readonly unsubscribe: (() => Promise<void>)[] = [];

  constructor(private readonly options: WorkerNodeOptions) {
    const { registry, store, workerId, clock, log, ttlMs } = options;
    this.ownership = new OwnershipManager({
      store,
      workerId,
      clock,
      log,
      ttlMs,
      info: options.info,
      listServers: options.listServers,
      isEligible: (id) => registry.isManaged(id),
      playerCount: (id) => registry.find(id)?.state.activePlayers.length ?? 0,
      onOwned: (id) => this.onOwned(id),
      onLost: (id, reason) => this.onLost(id, reason),
      // Keeps the status entry alive for as long as the lease
      onRenewed: (id) => this.writeStatus(id),
      claimIntervalMs: options.claimIntervalMs,
      rebalanceIntervalMs: options.rebalanceIntervalMs,
    });

    registry.events.on("connect", (serverId) =>
      this.statusChanged(serverId, { event: "connect", serverId }),
    );
    registry.events.on("disconnect", (serverId) =>
      this.statusChanged(serverId, { event: "disconnect", serverId }),
    );
    registry.events.on("reconnect", (serverId, type, time) =>
      this.statusChanged(serverId, {
        event: "reconnect",
        serverId,
        type,
        time,
      }),
    );
    registry.events.on("adminCommand", (serverId, notifications) =>
      this.publishGlobal({ event: "adminCommand", serverId, notifications }),
    );
  }

  async start(): Promise<void> {
    const { store, workerId } = this.options;
    this.unsubscribe.push(
      await store.subscribe(
        clusterKeys.rpc(workerId),
        (message) => void this.handleRpc(message),
      ),
      await store.subscribe(SERVER_EVENTS_CHANNEL, (message) => {
        const event = decodeServerLifecycleEvent(message);
        if (!event)
          return this.options.log.warn(
            { message },
            "Ignoring malformed server lifecycle event",
          );
        this.handleLifecycleEvent(event).catch((error) =>
          this.options.log.error(
            { err: error, event },
            "Failed to handle server lifecycle event",
          ),
        );
      }),
      await store.subscribe(clusterKeys.control, (raw) => {
        let message: ControlMessage;
        try {
          message = JSON.parse(raw);
        } catch {
          return;
        }
        if (message.action === "claim") void this.ownership.claimSoon();
      }),
    );
    await this.ownership.start();
  }

  // Disposes every runtime and frees its lease, so another worker can take over within seconds
  async stop(): Promise<void> {
    await Promise.all(
      this.unsubscribe.splice(0).map((stop) => stop().catch(() => undefined)),
    );
    await this.ownership.stop();
  }

  async handleLifecycleEvent(event: ServerLifecycleEvent): Promise<void> {
    const { serverId } = event;
    const runtime = this.ownership.owns(serverId)
      ? this.options.registry.find(serverId)
      : undefined;

    switch (event.type) {
      case "server.created":
        await this.ownership.claimSoon();
        return;
      case "server.updated":
        if (runtime) await runtime.applyServerUpdate();
        else await this.ownership.claimSoon();
        return;
      case "server.deleted":
        await this.ownership.release(serverId, "removed");
        return;
      case "server.plugins.updated":
        await runtime?.refreshPlugins();
        return;
    }
  }

  private onOwned(serverId: string) {
    const runtime = this.options.registry.add(serverId);
    if (!runtime) return;

    const stops = forwardedServerEvents.map((event) =>
      runtime.events.on(event, (...args: unknown[]) => {
        const message: ServerEventMessage = { event, args };
        this.publish(clusterKeys.serverEvents(serverId), message);
      }),
    );
    this.detach.set(serverId, () => stops.forEach((stop) => stop()));
    this.writeStatus(serverId);
    this.publishGlobal({
      event: "owned",
      serverId,
      workerId: this.options.workerId,
    });
    void this.announceTakeover(serverId, runtime);
  }

  // Tells players and the dashboard where the server came from, crash included
  private async announceTakeover(serverId: string, runtime: ServerRuntime) {
    const { store, workerId, log } = this.options;
    try {
      const [previous, reason] = await store.owners([
        clusterKeys.lastOwner(serverId),
        clusterKeys.handover(serverId),
      ]);
      await store.setFlag(clusterKeys.lastOwner(serverId), workerId);
      if (reason) await store.deleteFlag(clusterKeys.handover(serverId));
      if (!previous || previous === workerId) return;

      const { kind, note } =
        takeover[isHandoverReason(reason) ? reason : "crash"];
      if (note && this.ownership.owns(serverId)) runtime.setConnectNote(note);
      this.publishGlobal({
        event: "handover",
        serverId,
        kind,
        workerId,
        previous,
      });
    } catch (error) {
      log.warn(
        { err: errorMessage(error), serverId },
        "Could not record the server handover",
      );
    }
  }

  private handoverReason(
    serverId: string,
    reason: LossReason,
  ): HandoverReason | null {
    const requested = this.releaseReasons.get(serverId);
    this.releaseReasons.delete(serverId);
    switch (reason) {
      case "removed":
        return null;
      case "shutdown":
        return "shutdown";
      case "lost":
      case "overdue":
        return "lease";
      case "released":
        return requested ?? "rebalance";
    }
  }

  private async onLost(serverId: string, reason: LossReason) {
    const { store } = this.options;
    const handover = this.handoverReason(serverId, reason);
    this.detach.get(serverId)?.();
    this.detach.delete(serverId);
    await this.options.registry.remove(
      serverId,
      goodbye[handover ?? "removed"],
    );
    // Written before the lease is released; not awaited after a lease loss, as Redis may be down
    const record = handover
      ? store.setFlag(clusterKeys.handover(serverId), handover, HANDOVER_TTL_MS)
      : store.deleteFlag(clusterKeys.lastOwner(serverId));
    if (handover === "lease") void record.catch(() => undefined);
    else await record.catch(() => undefined);
    await this.options.store.dropStatus(serverId).catch(() => undefined);
    const event = reason === "removed" ? "removed" : "released";
    this.publishGlobal({ event, serverId, workerId: this.options.workerId });
  }

  private async handleRpc(raw: string) {
    let request: RpcRequest;
    try {
      request = JSON.parse(raw);
    } catch {
      return this.options.log.warn("Ignoring malformed RPC request");
    }

    let reply: RpcReply;
    const runtime = this.ownership.owns(request.serverId)
      ? this.options.registry.find(request.serverId)
      : undefined;
    if (!runtime) {
      reply = {
        id: request.id,
        ok: false,
        code: "ServerUnavailable",
        message: `Server ${request.serverId} is not owned by worker ${this.options.workerId}`,
        notOwner: true,
      };
    } else {
      try {
        let data: unknown;
        if (request.op === RELEASE_OP) {
          const reason = (request.args as { reason?: unknown } | null)?.reason;
          this.releaseReasons.set(
            request.serverId,
            isHandoverReason(reason) ? reason : "move",
          );
          data = await this.ownership.release(request.serverId, "released");
        } else data = await runOp(runtime, request.op, request.args);
        reply = { id: request.id, ok: true, data: data ?? null };
      } catch (error) {
        reply =
          error instanceof AppError
            ? {
                id: request.id,
                ok: false,
                code: error.code,
                message: error.message,
              }
            : {
                id: request.id,
                ok: false,
                code: "InternalError",
                message: "Internal server error",
              };
        if (!(error instanceof AppError)) {
          this.options.log.error(
            { err: error, op: request.op, serverId: request.serverId },
            "RPC failed",
          );
        }
      }
    }

    this.publish(request.replyTo, reply);
  }

  private statusChanged(serverId: string, message: GlobalEventMessage) {
    this.writeStatus(serverId);
    this.publishGlobal(message);
  }

  private writeStatus(serverId: string) {
    const runtime = this.options.registry.find(serverId);
    if (!runtime || !this.ownership.owns(serverId)) return;
    this.options.store
      .writeStatus(runtime.status(), this.options.ttlMs)
      .catch((error) =>
        this.options.log.warn(
          { err: errorMessage(error), serverId },
          "Could not write status",
        ),
      );
  }

  private publishGlobal(message: GlobalEventMessage) {
    this.publish(clusterKeys.globalEvents, message);
  }

  private publish(channel: string, message: unknown) {
    this.options.store
      .publish(channel, JSON.stringify(message))
      .catch((error) =>
        this.options.log.warn(
          { err: errorMessage(error), channel },
          "Publish failed",
        ),
      );
  }
}
