import {
  encodeServerLifecycleEvent,
  SERVER_EVENTS_CHANNEL,
  type NotificationDto,
  type ServerClient,
  type ServerLifecycleEvent,
} from "@tmcontrolpanel/shared";
import { randomUUID } from "node:crypto";
import { AppError, errorMessage } from "../errors";
import { TypedEventBus } from "../events";
import type { Logger } from "../logger";
import type { Clock } from "../ports";
import type {
  GatewayEventMap,
  GatewayHealth,
  ServerEventListener,
  ServerGateway,
} from "./gateway";
import {
  opTimeoutMs,
  type OpArgs,
  type OpResult,
  type RuntimeOpName,
} from "./ops";
import {
  clusterKeys,
  type ClusterStore,
  type GlobalEventMessage,
  type RpcReply,
  type RpcRequest,
  type ServerEventMessage,
} from "./protocol";

interface Pending {
  resolve: (reply: RpcReply) => void;
  timer: unknown;
}

export interface ClusterGatewayOptions {
  frontId: string;
  store: ClusterStore;
  clock: Clock;
  log: Logger;
  timeoutMs?: (op: string) => number;
}

// Front side of the cluster: finds the owning worker of a server and talks to it over Redis
export class ClusterGateway implements ServerGateway {
  readonly events: TypedEventBus<GatewayEventMap>;
  private readonly pending = new Map<string, Pending>();
  private readonly unsubscribe: (() => Promise<void>)[] = [];

  constructor(private readonly options: ClusterGatewayOptions) {
    this.events = new TypedEventBus<GatewayEventMap>(options.log);
  }

  async start(): Promise<void> {
    const { store, frontId } = this.options;
    this.unsubscribe.push(
      await store.subscribe(clusterKeys.reply(frontId), (raw) =>
        this.onReply(raw),
      ),
      await store.subscribe(clusterKeys.globalEvents, (raw) =>
        this.onGlobal(raw),
      ),
    );
  }

  async stop(): Promise<void> {
    await Promise.all(
      this.unsubscribe.splice(0).map((stop) => stop().catch(() => undefined)),
    );
    for (const [id, entry] of this.pending) {
      this.options.clock.clearTimeout(entry.timer);
      entry.resolve({
        id,
        ok: false,
        code: "ServerUnavailable",
        message: "Service is shutting down",
      });
    }
    this.pending.clear();
  }

  list(): Promise<ServerClient[]> {
    return this.options.store.listStatus();
  }

  async call<K extends RuntimeOpName>(
    serverId: string,
    op: K,
    args?: OpArgs<K>,
  ): Promise<OpResult<K>> {
    // Only undelivered requests (no receiver, or a worker that no longer owns it) are retried
    for (let attempt = 0; ; attempt++) {
      const owner = (
        await this.options.store.owners([clusterKeys.lease(serverId)])
      )[0];
      if (!owner) throw unavailable(serverId);

      const outcome = await this.send(owner, serverId, op, args);
      if (outcome === "undelivered" || (!outcome.ok && outcome.notOwner)) {
        if (attempt === 0) continue;
        throw unavailable(serverId);
      }
      if (!outcome.ok) throw new AppError(outcome.code, outcome.message);
      return outcome.data as OpResult<K>;
    }
  }

  async watch(
    serverId: string,
    listener: ServerEventListener,
  ): Promise<() => void> {
    return this.options.store
      .subscribe(clusterKeys.serverEvents(serverId), (raw) => {
        let message: ServerEventMessage;
        try {
          message = JSON.parse(raw);
        } catch {
          return;
        }
        listener(message.event, message.args);
      })
      .then((stop) => () => void stop().catch(() => undefined));
  }

  // Every worker hears lifecycle events; the owner (or the claim loop) acts on them
  async handleLifecycleEvent(event: ServerLifecycleEvent): Promise<void> {
    await this.options.store.publish(
      SERVER_EVENTS_CHANNEL,
      encodeServerLifecycleEvent(event),
    );
  }

  async health(): Promise<GatewayHealth> {
    const { store } = this.options;
    try {
      const [reachable, workers, statuses] = await Promise.all([
        store.ping(),
        store.liveWorkers(),
        store.listStatus(),
      ]);
      return {
        ok: reachable && workers.length > 0,
        servers: statuses.length,
        connected: statuses.filter((s) => s.isConnected).length,
        workers: workers.length,
      };
    } catch (error) {
      this.options.log.warn(
        { err: errorMessage(error) },
        "Health check failed",
      );
      return { ok: false, servers: 0, connected: 0, workers: 0 };
    }
  }

  private async send(
    owner: string,
    serverId: string,
    op: string,
    args: unknown,
  ): Promise<RpcReply | "undelivered"> {
    const { store, clock, frontId } = this.options;
    const id = randomUUID();
    const request: RpcRequest = {
      id,
      op,
      serverId,
      args: args ?? null,
      replyTo: clusterKeys.reply(frontId),
    };
    const timeoutMs = (this.options.timeoutMs ?? opTimeoutMs)(op);

    // Registered before publishing, so a fast reply can't slip past
    const reply = new Promise<RpcReply>((resolve) => {
      const timer = clock.setTimeout(() => {
        this.pending.delete(id);
        resolve({
          id,
          ok: false,
          code: "UpstreamError",
          message: `Server ${serverId} did not answer ${op} in time`,
        });
      }, timeoutMs);
      this.pending.set(id, { resolve, timer });
    });

    let receivers: number;
    try {
      receivers = await store.publish(
        clusterKeys.rpc(owner),
        JSON.stringify(request),
      );
    } catch (error) {
      this.settle(id);
      throw new AppError(
        "ServerUnavailable",
        `Could not reach the GBX workers: ${errorMessage(error)}`,
      );
    }
    if (receivers === 0) {
      this.settle(id);
      return "undelivered";
    }
    return reply;
  }

  private settle(id: string) {
    const entry = this.pending.get(id);
    if (!entry) return;
    this.options.clock.clearTimeout(entry.timer);
    this.pending.delete(id);
  }

  private onReply(raw: string) {
    let reply: RpcReply;
    try {
      reply = JSON.parse(raw);
    } catch {
      return;
    }
    const entry = this.pending.get(reply.id);
    if (!entry) return;
    this.settle(reply.id);
    entry.resolve(reply);
  }

  private onGlobal(raw: string) {
    let message: GlobalEventMessage;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    const { serverId } = message;
    switch (message.event) {
      case "connect":
      case "disconnect":
        return this.events.emit(message.event, serverId);
      case "reconnect":
        return this.events.emit(
          "reconnect",
          serverId,
          message.type,
          message.time,
        );
      case "adminCommand":
        return this.events.emit(
          "adminCommand",
          serverId,
          message.notifications as NotificationDto[],
        );
      case "owned":
        return this.events.emit("owned", serverId);
      case "removed":
        return this.events.emit("removed", serverId);
      case "released":
        // The next owner announces itself; until then the server shows as disconnected
        return this.events.emit("disconnect", serverId);
    }
  }
}

const unavailable = (serverId: string) =>
  new AppError(
    "ServerUnavailable",
    `No GBX worker owns server ${serverId} right now`,
  );
