import type { ServerLifecycleEvent } from "@gcp/shared";
import { AppError } from "../errors";
import { TypedEventBus } from "../events";
import type { Logger } from "../logger";
import type { ServerRepository } from "../ports";
import type { RegistryEventMap } from "./server-events";
import type { ServerRuntime } from "./server-runtime";

export interface ServerRegistryOptions {
  servers: ServerRepository;
  createRuntime: (serverId: string) => ServerRuntime;
  log: Logger;
  // Restricts which servers this instance manages (empty = all)
  enabledServerIds?: string[];
}

export class ServerRegistry {
  readonly events: TypedEventBus<RegistryEventMap>;
  private readonly runtimes = new Map<string, ServerRuntime>();
  private readonly enabled: Set<string> | null;

  constructor(private readonly options: ServerRegistryOptions) {
    this.events = new TypedEventBus<RegistryEventMap>(options.log);
    this.enabled =
      options.enabledServerIds && options.enabledServerIds.length > 0
        ? new Set(options.enabledServerIds)
        : null;
  }

  isManaged(serverId: string): boolean {
    return this.enabled === null || this.enabled.has(serverId);
  }

  // Creates runtimes for every active server; connections are attempted in the background
  async startAll(): Promise<void> {
    const ids = await this.options.servers.listActiveIds();
    for (const id of ids) this.add(id);
  }

  add(serverId: string): ServerRuntime | null {
    if (!this.isManaged(serverId)) return null;

    const existing = this.runtimes.get(serverId);
    if (existing) return existing;

    const runtime = this.options.createRuntime(serverId);
    this.runtimes.set(serverId, runtime);

    runtime.events.on("connect", () => this.events.emit("connect", serverId));
    runtime.events.on("disconnect", () => this.events.emit("disconnect", serverId));
    runtime.events.on("reconnect", (type, time) =>
      this.events.emit("reconnect", serverId, type, time),
    );
    runtime.events.on("adminCommand", (notifications) =>
      this.events.emit("adminCommand", serverId, notifications),
    );

    this.events.emit("runtimeAdded", serverId);
    void runtime.start();
    return runtime;
  }

  async remove(serverId: string): Promise<void> {
    const runtime = this.runtimes.get(serverId);
    if (!runtime) return;

    // Unregister first, so a duplicate event (HTTP plus the Redis fallback) cannot dispose it twice
    this.runtimes.delete(serverId);
    await runtime.dispose();
    this.events.emit("runtimeRemoved", serverId);
  }

  find(serverId: string): ServerRuntime | undefined {
    return this.runtimes.get(serverId);
  }

  get(serverId: string): ServerRuntime {
    const runtime = this.runtimes.get(serverId);
    if (!runtime) {
      throw new AppError("ServerNotFound", `Server ${serverId} is not managed by this service`);
    }
    return runtime;
  }

  list(): ServerRuntime[] {
    return [...this.runtimes.values()];
  }

  async handleLifecycleEvent(event: ServerLifecycleEvent): Promise<void> {
    const { serverId } = event;
    this.options.log.info({ event }, "Handling server lifecycle event");

    switch (event.type) {
      case "server.created":
        this.add(serverId);
        return;
      case "server.updated": {
        const runtime = this.runtimes.get(serverId);
        if (runtime) {
          await runtime.applyServerUpdate();
        } else {
          this.add(serverId);
        }
        return;
      }
      case "server.deleted":
        await this.remove(serverId);
        return;
      case "server.plugins.updated":
        await this.runtimes.get(serverId)?.refreshPlugins();
        return;
    }
  }

  async shutdown(): Promise<void> {
    await Promise.all(this.list().map((runtime) => runtime.dispose()));
    this.runtimes.clear();
  }
}
