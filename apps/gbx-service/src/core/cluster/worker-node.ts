import {
  decodeServerLifecycleEvent,
  SERVER_EVENTS_CHANNEL,
  type ServerLifecycleEvent,
} from "@tmcontrolpanel/shared";
import { AppError, errorMessage } from "../errors";
import type { Logger } from "../logger";
import type { Clock } from "../ports";
import type { ServerRegistry } from "../server/server-registry";
import { runOp } from "./ops";
import { OwnershipManager, type LossReason } from "./ownership";
import {
  clusterKeys,
  forwardedServerEvents,
  type ClusterStore,
  type GlobalEventMessage,
  type RpcReply,
  type RpcRequest,
  type ServerEventMessage,
} from "./protocol";

export interface WorkerNodeOptions {
  workerId: string;
  registry: ServerRegistry;
  store: ClusterStore;
  listServers: () => Promise<string[]>;
  clock: Clock;
  log: Logger;
  ttlMs: number;
  claimIntervalMs?: number;
  rebalanceIntervalMs?: number;
}

// One worker process: owns servers through leases, runs their commands and publishes their events
export class WorkerNode {
  readonly ownership: OwnershipManager;
  private readonly detach = new Map<string, () => void>();
  private readonly unsubscribe: (() => Promise<void>)[] = [];

  constructor(private readonly options: WorkerNodeOptions) {
    const { registry, store, workerId, clock, log, ttlMs } = options;
    this.ownership = new OwnershipManager({
      store,
      workerId,
      clock,
      log,
      ttlMs,
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
  }

  private async onLost(serverId: string, reason: LossReason) {
    this.detach.get(serverId)?.();
    this.detach.delete(serverId);
    await this.options.registry.remove(serverId);
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
        reply = {
          id: request.id,
          ok: true,
          data: (await runOp(runtime, request.op, request.args)) ?? null,
        };
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
