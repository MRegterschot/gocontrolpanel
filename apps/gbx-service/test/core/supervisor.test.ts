import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clusterKeys } from "../../src/core/cluster/protocol";
import {
  HEARTBEAT_MESSAGE,
  WorkerSupervisor,
  type WorkerSupervisorOptions,
} from "../../src/core/cluster/supervisor";
import { systemClock } from "../../src/core/ports";
import { MemoryClusterStore } from "../fakes/cluster-store";
import { silentLogger } from "../fakes/logger";

class FakeChild extends EventEmitter {
  readonly pid = 1234;
  ignoreTerm = false;
  readonly send = vi.fn();
  readonly kill = vi.fn((signal: NodeJS.Signals = "SIGTERM") => {
    if (signal !== "SIGTERM" || !this.ignoreTerm) {
      Promise.resolve().then(() => this.emit("exit", 0, signal));
    }
    return true;
  });
}

async function settle() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

describe("WorkerSupervisor", () => {
  let supervisor: WorkerSupervisor | undefined;
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        "Date",
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
      ],
    });
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(async () => {
    const stopped = supervisor?.stop();
    await vi.advanceTimersByTimeAsync(10000);
    await stopped;
    supervisor = undefined;
    vi.useRealTimers();
  });

  function setup(options: Partial<WorkerSupervisorOptions> = {}) {
    const children: FakeChild[] = [];
    const store = new MemoryClusterStore(systemClock);
    const spawn = vi.fn((_entry: string, _env: NodeJS.ProcessEnv) => {
      const child = new FakeChild();
      children.push(child);
      return child as unknown as ChildProcess;
    });
    supervisor = new WorkerSupervisor({
      count: 1,
      nodeId: "node-a",
      entry: "worker.js",
      store,
      log: silentLogger,
      spawn,
      ...options,
    });
    supervisor.start();
    return { supervisor, store, spawn, children };
  }

  it("spawns distinct worker ids for each numbered slot", () => {
    const { supervisor, spawn } = setup({ count: 3 });
    expect(supervisor.liveCount()).toBe(3);
    expect(spawn).toHaveBeenCalledTimes(3);
    const ids = spawn.mock.calls.map(([entry, env], index) => {
      expect(entry).toBe("worker.js");
      expect(env.GBX_WORKER_ID).toMatch(new RegExp(`^node-a:${index + 1}\\.`));
      return env.GBX_WORKER_ID;
    });
    expect(new Set(ids).size).toBe(3);
  });

  it("releases a crashed worker's leases and publishes released before respawning", async () => {
    const { supervisor, store, spawn, children } = setup();
    const workerId = spawn.mock.calls[0][1].GBX_WORKER_ID!;
    await store.claim(clusterKeys.lease("server-1"), workerId, 60000);
    await store.heartbeat(workerId, 60000);
    const messages: unknown[] = [];
    await store.subscribe(clusterKeys.globalEvents, (raw) =>
      messages.push(JSON.parse(raw)),
    );
    children[0].emit("exit", 1, null);
    await settle();
    expect(supervisor.liveCount()).toBe(0);
    expect(
      await store.claim(clusterKeys.lease("server-1"), "replacement", 60000),
    ).toBe(true);
    expect(await store.liveWorkers()).not.toContain(workerId);
    expect(messages).toEqual([
      { event: "released", serverId: "server-1", workerId },
    ]);
    await vi.advanceTimersByTimeAsync(999);
    expect(spawn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(spawn).toHaveBeenCalledTimes(2);
    expect(spawn.mock.calls[1][1].GBX_WORKER_ID).not.toBe(workerId);
  });

  it("doubles backoff after quick crashes and caps it at thirty seconds", async () => {
    const { spawn, children } = setup();
    for (const [index, delay] of [
      1000, 2000, 4000, 8000, 16000, 30000, 30000,
    ].entries()) {
      children[index].emit("exit", 1, null);
      await settle();
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(spawn).toHaveBeenCalledTimes(index + 1);
      await vi.advanceTimersByTimeAsync(1);
      expect(spawn).toHaveBeenCalledTimes(index + 2);
    }
  });

  it("allows startup grace and fresh heartbeats before killing a silent child", async () => {
    const { children } = setup({
      startupGraceMs: 2000,
      heartbeatTimeoutMs: 2000,
    });
    const child = children[0];
    await vi.advanceTimersByTimeAsync(4000);
    expect(child.kill).not.toHaveBeenCalled();
    child.emit("message", HEARTBEAT_MESSAGE);
    await vi.advanceTimersByTimeAsync(2000);
    expect(child.kill).not.toHaveBeenCalled();
    child.emit("message", "unrelated");
    await vi.advanceTimersByTimeAsync(1000);
    expect(child.kill).toHaveBeenCalledExactlyOnceWith("SIGKILL");
  });

  it("stops children with SIGTERM and cancels pending restarts", async () => {
    const { supervisor, children, spawn } = setup({ count: 2 });
    children[0].emit("exit", 1, null);
    await settle();
    await supervisor.stop();
    expect(children[1].kill).toHaveBeenCalledExactlyOnceWith("SIGTERM");
    await vi.advanceTimersByTimeAsync(60000);
    expect(spawn).toHaveBeenCalledTimes(2);
    expect(supervisor.liveCount()).toBe(0);
  });

  it("kills a child that ignores SIGTERM after the stop timeout without respawning", async () => {
    const { supervisor, children, spawn } = setup({ stopTimeoutMs: 2500 });
    const child = children[0];
    child.ignoreTerm = true;
    const stopped = supervisor.stop();
    expect(child.kill).toHaveBeenCalledExactlyOnceWith("SIGTERM");
    await vi.advanceTimersByTimeAsync(2499);
    expect(child.kill).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await stopped;
    expect(child.kill.mock.calls).toEqual([["SIGTERM"], ["SIGKILL"]]);
    await vi.advanceTimersByTimeAsync(60000);
    expect(spawn).toHaveBeenCalledTimes(1);
  });
});
