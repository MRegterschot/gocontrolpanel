import type {
  NotificationDto,
  ServerClient,
  ServerLifecycleEvent,
} from "@tmcontrolpanel/shared";
import { AppError } from "../errors";
import { TypedEventBus } from "../events";
import type { Logger } from "../logger";
import type { ServerRegistry } from "../server/server-registry";
import { runOp, type OpArgs, type OpResult, type RuntimeOpName } from "./ops";
import { forwardedServerEvents, type ForwardedServerEvent } from "./protocol";

// Events the browser sockets react to, whichever process owns the server
export type GatewayEventMap = {
  connect: [serverId: string];
  disconnect: [serverId: string];
  reconnect: [serverId: string, type: "try" | "stop", time: number | null];
  adminCommand: [serverId: string, notifications: NotificationDto[]];
  // A (new) owner took the server over; open sockets fetch a fresh snapshot
  owned: [serverId: string];
  // The server was deleted; its sockets close
  removed: [serverId: string];
};

export type ServerEventListener = (
  event: ForwardedServerEvent,
  args: unknown[],
) => void;

export interface GatewayHealth {
  ok: boolean;
  servers: number;
  connected: number;
  workers?: number;
}

// What the HTTP API and sockets need from the servers, in process or across the cluster
export interface ServerGateway {
  readonly events: TypedEventBus<GatewayEventMap>;
  list(): Promise<ServerClient[]>;
  call<K extends RuntimeOpName>(
    serverId: string,
    op: K,
    args?: OpArgs<K>,
  ): Promise<OpResult<K>>;
  // Resolves once events for the server are flowing to the listener
  watch(serverId: string, listener: ServerEventListener): Promise<() => void>;
  handleLifecycleEvent(event: ServerLifecycleEvent): Promise<void>;
  health(): Promise<GatewayHealth>;
}

// Serves the servers of the registry in this process (GBX_WORKERS=0 and tests)
export class LocalGateway implements ServerGateway {
  readonly events: TypedEventBus<GatewayEventMap>;

  constructor(
    private readonly registry: ServerRegistry,
    log: Logger,
  ) {
    this.events = new TypedEventBus<GatewayEventMap>(log);
    const { events } = registry;
    events.on("connect", (id) => this.events.emit("connect", id));
    events.on("disconnect", (id) => this.events.emit("disconnect", id));
    events.on("reconnect", (id, type, time) =>
      this.events.emit("reconnect", id, type, time),
    );
    events.on("adminCommand", (id, n) =>
      this.events.emit("adminCommand", id, n),
    );
    events.on("runtimeRemoved", (id) => this.events.emit("removed", id));
  }

  async list(): Promise<ServerClient[]> {
    return this.registry.list().map((runtime) => runtime.status());
  }

  async call<K extends RuntimeOpName>(
    serverId: string,
    op: K,
    args?: OpArgs<K>,
  ): Promise<OpResult<K>> {
    return (await runOp(this.registry.get(serverId), op, args)) as OpResult<K>;
  }

  async watch(
    serverId: string,
    listener: ServerEventListener,
  ): Promise<() => void> {
    const runtime = this.registry.find(serverId);
    if (!runtime) {
      throw new AppError(
        "ServerNotFound",
        `Server ${serverId} is not managed by this service`,
      );
    }
    const stops = forwardedServerEvents.map((event) =>
      runtime.events.on(event, (...args: unknown[]) => listener(event, args)),
    );
    return () => stops.forEach((stop) => stop());
  }

  handleLifecycleEvent(event: ServerLifecycleEvent): Promise<void> {
    return this.registry.handleLifecycleEvent(event);
  }

  async health(): Promise<GatewayHealth> {
    const runtimes = this.registry.list();
    return {
      ok: true,
      servers: runtimes.length,
      connected: runtimes.filter((r) => r.isConnected).length,
    };
  }
}
