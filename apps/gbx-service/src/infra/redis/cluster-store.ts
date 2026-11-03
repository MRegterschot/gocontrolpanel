import type { ServerClient } from "@tmcontrolpanel/shared";
import type { Redis } from "ioredis";
import {
  clusterKeys,
  type ClusterStore,
  type LeaseEntry,
  type WorkerInfo,
} from "../../core/cluster/protocol";
import { whenReady } from "./redis";

const renewScript = `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('PEXPIRE', KEYS[1], ARGV[2]) end return 0`;
const releaseScript = `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0`;
const releaseServerScript = `if redis.call('GET', KEYS[1]) == ARGV[1] then redis.call('DEL', KEYS[1], KEYS[2]); return 1 end return 0`;
type Handler = (message: string) => void;

export class RedisClusterStore implements ClusterStore {
  private readonly handlers = new Map<string, Set<Handler>>();
  private subscriptionChanges: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly redis: Redis,
    private readonly subscriber: Redis,
  ) {
    subscriber.on("message", (channel: string, message: string) => {
      for (const handler of [...(this.handlers.get(channel) ?? [])]) {
        try {
          handler(message);
        } catch {
          /* One consumer must not interrupt the others. */
        }
      }
    });
  }

  async claim(key: string, owner: string, ttlMs: number): Promise<boolean> {
    return (await this.redis.set(key, owner, "PX", ttlMs, "NX")) === "OK";
  }
  async renew(key: string, owner: string, ttlMs: number): Promise<boolean> {
    return (await this.redis.eval(renewScript, 1, key, owner, ttlMs)) === 1;
  }
  async release(key: string, owner: string): Promise<boolean> {
    return (await this.redis.eval(releaseScript, 1, key, owner)) === 1;
  }
  async owners(keys: string[]): Promise<(string | null)[]> {
    return keys.length ? this.redis.mget(...keys) : [];
  }
  async releaseServersOwnedBy(owner: string): Promise<string[]> {
    const released: string[] = [];
    for (const key of await this.scan(clusterKeys.leasePattern)) {
      const id = key.slice(clusterKeys.lease("").length);
      if (
        (await this.redis.eval(
          releaseServerScript,
          2,
          key,
          clusterKeys.status(id),
          owner,
        )) === 1
      )
        released.push(id);
    }
    return released;
  }
  async heartbeat(
    workerId: string,
    ttlMs: number,
    info?: WorkerInfo,
  ): Promise<void> {
    await this.redis.set(
      clusterKeys.worker(workerId),
      info ? JSON.stringify(info) : workerId,
      "PX",
      ttlMs,
    );
  }
  async dropWorker(workerId: string): Promise<void> {
    await this.redis.del(clusterKeys.worker(workerId));
  }
  async liveWorkers(): Promise<string[]> {
    return (await this.scan(clusterKeys.workerPattern)).map((key) =>
      key.slice(clusterKeys.worker("").length),
    );
  }
  async workers(): Promise<{ id: string; info: WorkerInfo | null }[]> {
    const keys = await this.scan(clusterKeys.workerPattern);
    const values = await this.owners(keys);
    return keys.map((key, i) => {
      let info: WorkerInfo | null = null;
      try {
        info = JSON.parse(values[i]!) as WorkerInfo;
      } catch {}
      return { id: key.slice(clusterKeys.worker("").length), info };
    });
  }
  async leases(): Promise<LeaseEntry[]> {
    const keys = await this.scan(clusterKeys.leasePattern);
    if (!keys.length) return [];
    const pipeline = this.redis.pipeline();
    for (const key of keys) {
      pipeline.get(key);
      pipeline.pttl(key);
    }
    const results = await pipeline.exec();
    if (!results) return [];
    const leases: LeaseEntry[] = [];
    keys.forEach((key, i) => {
      const [error, owner] = results[i * 2]!;
      const [ttlError, ttl] = results[i * 2 + 1]!;
      if (error) throw error;
      if (ttlError) throw ttlError;
      if (typeof owner === "string" && typeof ttl === "number" && ttl !== -2)
        leases.push({
          serverId: key.slice(clusterKeys.lease("").length),
          owner,
          ttlMs: ttl,
        });
    });
    return leases;
  }
  async setFlag(key: string, value: string, ttlMs?: number): Promise<void> {
    if (ttlMs === undefined) await this.redis.set(key, value);
    else await this.redis.set(key, value, "PX", ttlMs);
  }
  async deleteFlag(key: string): Promise<void> {
    await this.redis.del(key);
  }
  async heldServers(): Promise<string[]> {
    return (await this.scan(clusterKeys.holdPattern)).map((key) =>
      key.slice(clusterKeys.hold("").length),
    );
  }
  async writeStatus(status: ServerClient, ttlMs: number): Promise<void> {
    await this.redis.set(
      clusterKeys.status(status.serverId),
      JSON.stringify(status),
      "PX",
      ttlMs,
    );
  }
  async dropStatus(serverId: string): Promise<void> {
    await this.redis.del(clusterKeys.status(serverId));
  }
  async readStatus(serverId: string): Promise<ServerClient | null> {
    return this.parseStatus(await this.redis.get(clusterKeys.status(serverId)));
  }
  async listStatus(): Promise<ServerClient[]> {
    const values = await this.owners(
      await this.scan(clusterKeys.statusPattern),
    );
    return values
      .map((value) => this.parseStatus(value))
      .filter((value): value is ServerClient => value !== null);
  }
  async publish(channel: string, message: string): Promise<number> {
    return this.redis.publish(channel, message);
  }
  async subscribe(
    channel: string,
    handler: Handler,
  ): Promise<() => Promise<void>> {
    await this.changeSubscription(async () => {
      let handlers = this.handlers.get(channel);
      if (!handlers) {
        handlers = new Set();
        this.handlers.set(channel, handlers);
        handlers.add(handler);
        try {
          await whenReady(this.subscriber);
          await this.subscriber.subscribe(channel);
        } catch (error) {
          this.handlers.delete(channel);
          throw error;
        }
      } else handlers.add(handler);
    });
    let removed = false;
    return () =>
      this.changeSubscription(async () => {
        if (removed) return;
        removed = true;
        const handlers = this.handlers.get(channel);
        handlers?.delete(handler);
        if (handlers?.size === 0) {
          this.handlers.delete(channel);
          await this.subscriber.unsubscribe(channel);
        }
      });
  }
  async ping(): Promise<boolean> {
    try {
      return (await this.redis.ping()) === "PONG";
    } catch {
      return false;
    }
  }
  private changeSubscription(change: () => Promise<void>): Promise<void> {
    const next = this.subscriptionChanges.then(change);
    this.subscriptionChanges = next.catch(() => undefined);
    return next;
  }
  private async scan(pattern: string): Promise<string[]> {
    const keys = new Set<string>();
    let cursor = "0";
    do {
      const [next, batch] = await this.redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      cursor = next;
      batch.forEach((key) => keys.add(key));
    } while (cursor !== "0");
    return [...keys];
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
