import {
  encodeServerLifecycleEvent,
  SERVER_EVENTS_CHANNEL,
  type ClusterCommand,
  type ClusterOverview,
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
  RELEASE_OP,
  type ClusterStore,
  type ControlMessage,
  type GlobalEventMessage,
  type HandoverReason,
  type RpcReply,
  type RpcRequest,
  type ServerEventMessage,
} from "./protocol";

// Long enough for the old owner to let go; short enough that a dead target doesn't block the server
const ASSIGN_TTL_MS = 30_000;

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

  async overview(): Promise<ClusterOverview> {
    const { store } = this.options;
    const [workers, leases, statuses, holds] = await Promise.all([
      store.workers(),
      store.leases(),
      store.listStatus(),
      store.heldServers(),
    ]);
    const leaseOf = new Map(leases.map((lease) => [lease.serverId, lease]));
    const statusOf = new Map(
      statuses.map((status) => [status.serverId, status]),
    );
    const held = new Set(holds);
    const ids = new Set([...leaseOf.keys(), ...statusOf.keys(), ...held]);

    return {
      mode: "cluster",
      workers: workers
        .map(({ id, info }) => ({
          id,
          nodeId: info?.nodeId ?? id.slice(0, id.lastIndexOf(":")),
          pid: info?.pid ?? null,
          startedAt: info?.startedAt ?? null,
          servers: leases
            .filter((lease) => lease.owner === id)
            .map((lease) => lease.serverId),
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      servers: [...ids].map((serverId) => ({
        serverId,
        owner: leaseOf.get(serverId)?.owner ?? null,
        leaseTtlMs: leaseOf.get(serverId)?.ttlMs ?? null,
        held: held.has(serverId),
        status: statusOf.get(serverId) ?? null,
      })),
    };
  }

  async control(command: ClusterCommand): Promise<void> {
    const { store, frontId } = this.options;
    switch (command.action) {
      case "move": {
        const { serverId, workerId } = command;
        const owner = await this.ownerOf(serverId);
        if (!owner)
          throw new AppError(
            "BadRequest",
            `Server ${serverId} has no owner; claim it instead`,
          );
        if (owner === workerId) return;
        await this.requireWorker(workerId);
        // Assigned before the release, so the old owner's next claim pass already skips it
        await store.setFlag(
          clusterKeys.assign(serverId),
          workerId,
          ASSIGN_TTL_MS,
        );
        await this.releaseOn(owner, serverId, "move");
        return this.wake();
      }
      case "claim": {
        const { serverId } = command;
        const owner = await this.ownerOf(serverId);
        if (owner)
          throw new AppError(
            "BadRequest",
            `Server ${serverId} is already owned by ${owner}`,
          );
        const target = command.workerId ?? (await this.leastLoadedWorker());
        await this.requireWorker(target);
        await store.deleteFlag(clusterKeys.hold(serverId));
        await store.setFlag(
          clusterKeys.assign(serverId),
          target,
          ASSIGN_TTL_MS,
        );
        return this.wake();
      }
      case "hold": {
        const { serverId } = command;
        await store.setFlag(clusterKeys.hold(serverId), frontId);
        const owner = await this.ownerOf(serverId);
        if (owner) await this.releaseOn(owner, serverId, "hold");
        return;
      }
      case "unhold":
        await store.deleteFlag(clusterKeys.hold(command.serverId));
        return this.wake();
      case "restartWorker":
        // The front that supervises it does the restart; see main.ts
        await this.requireWorker(command.workerId);
        await this.publishControl({
          action: "restartWorker",
          workerId: command.workerId,
        });
        return;
    }
  }

  private async ownerOf(serverId: string): Promise<string | null> {
    return (await this.options.store.owners([clusterKeys.lease(serverId)]))[0];
  }

  private async requireWorker(workerId: string) {
    if (!(await this.options.store.liveWorkers()).includes(workerId))
      throw new AppError("NotFound", `Worker ${workerId} is not running`);
  }

  private async leastLoadedWorker(): Promise<string> {
    const { store } = this.options;
    const [workers, leases] = await Promise.all([
      store.liveWorkers(),
      store.leases(),
    ]);
    if (workers.length === 0)
      throw new AppError("ServerUnavailable", "No GBX worker is running");
    const load = (id: string) =>
      leases.filter((lease) => lease.owner === id).length;
    return workers.reduce((best, id) => (load(id) < load(best) ? id : best));
  }

  // A dead or confused owner is fine: its lease expires, or its claim pass notices the hold
  private async releaseOn(
    owner: string,
    serverId: string,
    reason: HandoverReason,
  ) {
    const outcome = await this.send(owner, serverId, RELEASE_OP, { reason });
    if (outcome === "undelivered" || outcome.ok || outcome.notOwner) return;
    throw new AppError(outcome.code, outcome.message);
  }

  private wake() {
    return this.publishControl({ action: "claim" });
  }

  private async publishControl(message: ControlMessage) {
    await this.options.store.publish(
      clusterKeys.control,
      JSON.stringify(message),
    );
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
      case "handover": {
        const { kind, workerId, previous } = message;
        return this.events.emit("handover", {
          serverId,
          kind,
          workerId,
          previous,
        });
      }
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
