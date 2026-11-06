import type { ServerClient } from "@tmcontrolpanel/shared";
import {
  clusterKeys,
  type ClusterStore,
  type LeaseEntry,
  type WorkerInfo,
} from "../../src/core/cluster/protocol";
import type { Clock } from "../../src/core/ports";

type Handler = (message: string) => void;

export class MemoryClusterStore implements ClusterStore {
  down = false;
  private readonly values = new Map<
    string,
    { value: string; expiresAt: number }
  >();
  private readonly handlers = new Map<string, Set<Handler>>();

  constructor(private readonly clock: Clock) {}

  async claim(key: string, owner: string, ttlMs: number): Promise<boolean> {
    this.check();
    if (this.get(key) !== null) return false;
    this.set(key, owner, ttlMs);
    return true;
  }
  async renew(key: string, owner: string, ttlMs: number): Promise<boolean> {
    this.check();
    if (this.get(key) !== owner) return false;
    this.set(key, owner, ttlMs);
    return true;
  }
  async release(key: string, owner: string): Promise<boolean> {
    this.check();
    if (this.get(key) !== owner) return false;
    this.values.delete(key);
    return true;
  }
  async owners(keys: string[]): Promise<(string | null)[]> {
    this.check();
    return keys.map((key) => this.get(key));
  }
  async releaseServersOwnedBy(owner: string): Promise<string[]> {
    this.check();
    const released: string[] = [];
    for (const key of this.keys(clusterKeys.lease(""))) {
      if (this.get(key) !== owner) continue;
      const id = key.slice(clusterKeys.lease("").length);
      this.values.delete(key);
      this.values.delete(clusterKeys.status(id));
      released.push(id);
    }
    return released;
  }
  async heartbeat(
    workerId: string,
    ttlMs: number,
    info?: WorkerInfo,
  ): Promise<void> {
    this.check();
    this.set(
      clusterKeys.worker(workerId),
      info ? JSON.stringify(info) : workerId,
      ttlMs,
    );
  }
  async dropWorker(workerId: string): Promise<void> {
    this.check();
    this.values.delete(clusterKeys.worker(workerId));
  }
  async liveWorkers(): Promise<string[]> {
    this.check();
    return this.keys(clusterKeys.worker("")).map((key) =>
      key.slice(clusterKeys.worker("").length),
    );
  }
  async workers(): Promise<{ id: string; info: WorkerInfo | null }[]> {
    this.check();
    return this.keys(clusterKeys.worker("")).map((key) => {
      let info: WorkerInfo | null = null;
      try {
        info = JSON.parse(this.get(key)!) as WorkerInfo;
      } catch {}
      return { id: key.slice(clusterKeys.worker("").length), info };
    });
  }
  async leases(): Promise<LeaseEntry[]> {
    this.check();
    return this.keys(clusterKeys.lease("")).map((key) => ({
      serverId: key.slice(clusterKeys.lease("").length),
      owner: this.get(key)!,
      ttlMs: this.values.get(key)!.expiresAt - this.clock.now(),
    }));
  }
  async setFlag(key: string, value: string, ttlMs?: number): Promise<void> {
    this.check();
    this.set(key, value, ttlMs ?? Infinity);
  }
  async deleteFlag(key: string): Promise<void> {
    this.check();
    this.values.delete(key);
  }
  async heldServers(): Promise<string[]> {
    this.check();
    return this.keys(clusterKeys.hold("")).map((key) =>
      key.slice(clusterKeys.hold("").length),
    );
  }
  async writeStatus(status: ServerClient, ttlMs: number): Promise<void> {
    this.check();
    this.set(
      clusterKeys.status(status.serverId),
      JSON.stringify(status),
      ttlMs,
    );
  }
  async dropStatus(serverId: string): Promise<void> {
    this.check();
    this.values.delete(clusterKeys.status(serverId));
  }
  async readStatus(serverId: string): Promise<ServerClient | null> {
    this.check();
    return this.parseStatus(this.get(clusterKeys.status(serverId)));
  }
  async listStatus(): Promise<ServerClient[]> {
    this.check();
    return this.keys(clusterKeys.status(""))
      .map((key) => this.parseStatus(this.get(key)))
      .filter((value): value is ServerClient => value !== null);
  }
  async publish(channel: string, message: string): Promise<number> {
    this.check();
    const handlers = [...(this.handlers.get(channel) ?? [])];
    queueMicrotask(() => {
      for (const handler of handlers) {
        try {
          handler(message);
        } catch {
          /* Isolate consumers just like the Redis adapter. */
        }
      }
    });
    return handlers.length;
  }
  async subscribe(
    channel: string,
    handler: Handler,
  ): Promise<() => Promise<void>> {
    this.check();
    const handlers = this.handlers.get(channel) ?? new Set<Handler>();
    this.handlers.set(channel, handlers);
    handlers.add(handler);
    return async () => {
      this.check();
      handlers.delete(handler);
      if (handlers.size === 0) this.handlers.delete(channel);
    };
  }
  async ping(): Promise<boolean> {
    this.check();
    return true;
  }
  private check(): void {
    if (this.down) throw new Error("Cluster store unavailable");
  }
  private set(key: string, value: string, ttlMs: number): void {
    this.values.set(key, { value, expiresAt: this.clock.now() + ttlMs });
  }
  private get(key: string): string | null {
    const entry = this.values.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.clock.now()) {
      this.values.delete(key);
      return null;
    }
    return entry.value;
  }
  private keys(prefix: string): string[] {
    return [...this.values.keys()].filter(
      (key) => key.startsWith(prefix) && this.get(key) !== null,
    );
  }
  private parseStatus(raw: string | null): ServerClient | null {
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as ServerClient;
    } catch {
      return null;
    }
  }
}
