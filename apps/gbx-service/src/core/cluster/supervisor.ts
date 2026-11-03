import { fork, type ChildProcess } from "node:child_process";
import { errorMessage } from "../errors";
import type { Logger } from "../logger";
import {
  clusterKeys,
  type ClusterStore,
  type GlobalEventMessage,
} from "./protocol";

export interface WorkerSupervisorOptions {
  count: number;
  nodeId: string;
  entry: string;
  store: ClusterStore;
  log: Logger;
  // A worker whose event loop stays silent this long is killed (a stuck plugin, for example)
  heartbeatTimeoutMs?: number;
  // Startup gets extra time before the first heartbeat is due
  startupGraceMs?: number;
  stopTimeoutMs?: number;
  spawn?: (entry: string, env: NodeJS.ProcessEnv) => ChildProcess;
}

interface Slot {
  index: number;
  child: ChildProcess | null;
  workerId: string | null;
  startedAt: number;
  lastBeat: number;
  failures: number;
  restartTimer: NodeJS.Timeout | null;
}

export const HEARTBEAT_MESSAGE = "gbx:heartbeat";
const MAX_BACKOFF_MS = 30_000;
const STABLE_AFTER_MS = 60_000;

const defaultSpawn = (entry: string, env: NodeJS.ProcessEnv) =>
  // execArgv carries tsx's loader in development
  fork(entry, [], { env, execArgv: process.execArgv, stdio: "inherit" });

// Runs the worker processes of this container and restarts the ones that crash or hang
export class WorkerSupervisor {
  private readonly slots: Slot[] = [];
  private watchdog: NodeJS.Timeout | null = null;
  private stopping = false;

  constructor(private readonly options: WorkerSupervisorOptions) {}

  start(): void {
    for (let index = 1; index <= this.options.count; index++) {
      const slot: Slot = {
        index,
        child: null,
        workerId: null,
        startedAt: 0,
        lastBeat: 0,
        failures: 0,
        restartTimer: null,
      };
      this.slots.push(slot);
      this.spawn(slot);
    }
    this.watchdog = setInterval(() => this.checkHeartbeats(), 1000);
  }

  liveCount(): number {
    return this.slots.filter((slot) => slot.child).length;
  }

  // Asks every worker to hand its servers back, then kills whatever is left
  async stop(): Promise<void> {
    this.stopping = true;
    if (this.watchdog) clearInterval(this.watchdog);
    const timeout = this.options.stopTimeoutMs ?? 8000;

    await Promise.all(
      this.slots.map(async (slot) => {
        if (slot.restartTimer) clearTimeout(slot.restartTimer);
        const child = slot.child;
        if (!child) return;
        const exited = new Promise<void>((resolve) =>
          child.once("exit", () => resolve()),
        );
        child.kill("SIGTERM");
        const timer = setTimeout(() => child.kill("SIGKILL"), timeout);
        await exited;
        clearTimeout(timer);
      }),
    );
  }

  private spawn(slot: Slot) {
    const { nodeId, entry, log } = this.options;
    // A fresh id per process, so a restarted worker can't mistake old leases for its own
    const workerId = `${nodeId}:${slot.index}.${Date.now().toString(36)}`;
    const child = (this.options.spawn ?? defaultSpawn)(entry, {
      ...process.env,
      GBX_WORKER_ID: workerId,
    });

    slot.child = child;
    slot.workerId = workerId;
    slot.startedAt = Date.now();
    slot.lastBeat = slot.startedAt + (this.options.startupGraceMs ?? 30_000);
    log.info({ workerId, pid: child.pid }, "Started GBX worker");

    child.on("message", (message) => {
      if (message === HEARTBEAT_MESSAGE)
        slot.lastBeat = Math.max(slot.lastBeat, Date.now());
    });
    child.once(
      "exit",
      (code, signal) => void this.onExit(slot, child, workerId, code, signal),
    );
  }

  private checkHeartbeats() {
    const timeout = this.options.heartbeatTimeoutMs ?? 10_000;
    const now = Date.now();
    for (const slot of this.slots) {
      if (slot.child && now - slot.lastBeat > timeout) {
        this.options.log.error(
          { workerId: slot.workerId },
          "GBX worker stopped responding, killing it",
        );
        slot.child.kill("SIGKILL");
        // Don't kill it again while it exits
        slot.lastBeat = Number.POSITIVE_INFINITY;
      }
    }
  }

  private async onExit(
    slot: Slot,
    child: ChildProcess,
    workerId: string,
    code: number | null,
    signal: NodeJS.Signals | null,
  ) {
    if (slot.child !== child) return;
    slot.child = null;
    const { log, store } = this.options;
    const level = this.stopping && code === 0 ? "info" : "warn";
    log[level]({ workerId, code, signal }, "GBX worker exited");

    // Free its servers straight away instead of waiting for the leases to expire
    try {
      const released = await store.releaseServersOwnedBy(workerId);
      await store.dropWorker(workerId);
      await Promise.all(
        released.map((serverId) => {
          const message: GlobalEventMessage = {
            event: "released",
            serverId,
            workerId,
          };
          return store.publish(
            clusterKeys.globalEvents,
            JSON.stringify(message),
          );
        }),
      );
      if (released.length > 0)
        log.info({ workerId, released }, "Released servers of exited worker");
    } catch (error) {
      log.warn(
        { err: errorMessage(error), workerId },
        "Could not release leases of exited worker",
      );
    }

    if (this.stopping) return;
    const stable = Date.now() - slot.startedAt > STABLE_AFTER_MS;
    slot.failures = stable ? 1 : slot.failures + 1;
    const delay = Math.min(1000 * 2 ** (slot.failures - 1), MAX_BACKOFF_MS);
    log.info({ slot: slot.index, delay }, "Restarting GBX worker");
    slot.restartTimer = setTimeout(() => {
      slot.restartTimer = null;
      if (!this.stopping) this.spawn(slot);
    }, delay);
  }
}
