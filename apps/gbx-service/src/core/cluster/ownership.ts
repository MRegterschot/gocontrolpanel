import { errorMessage } from "../errors";
import type { Logger } from "../logger";
import type { Clock } from "../ports";
import { clusterKeys, type ClusterStore, type WorkerInfo } from "./protocol";

export type LossReason =
  | "lost"
  | "overdue"
  | "released"
  | "removed"
  | "shutdown";

export interface OwnershipOptions {
  store: ClusterStore;
  workerId: string;
  clock: Clock;
  log: Logger;
  ttlMs: number;
  // Shown on the cluster page next to the worker
  info?: WorkerInfo;
  listServers: () => Promise<string[]>;
  isEligible: (serverId: string) => boolean;
  playerCount: (serverId: string) => number;
  // Starts the runtime; only called after the claim succeeded
  onOwned: (serverId: string) => void;
  // Must finish disposing the runtime; the lease is released afterwards
  onLost: (serverId: string, reason: LossReason) => Promise<void>;
  onRenewed?: (serverId: string) => void;
  claimIntervalMs?: number;
  rebalanceIntervalMs?: number;
  // A runtime is disposed this long before its lease could expire by our own clock
  fenceMarginMs?: number;
  random?: () => number;
}

interface Owned {
  renewedAt: number;
  fence: unknown;
  // Placed here by an admin; rebalancing leaves it alone
  assigned: boolean;
}

// Claims, renews and gives up server leases for one worker. A runtime only runs while its lease
// is held, so two workers never control the same dedicated server.
export class OwnershipManager {
  private readonly owned = new Map<string, Owned>();
  // Servers this worker just gave away for rebalancing, so it doesn't take them straight back
  private readonly cooldown = new Map<string, number>();
  private readonly claimIntervalMs: number;
  private readonly rebalanceIntervalMs: number;
  private readonly fenceMarginMs: number;
  private lastRebalance: number;
  private claimTimer: unknown = null;
  private renewTimer: unknown = null;
  private claiming: Promise<void> | null = null;
  private claimAgain = false;
  private renewing = false;
  private stopped = true;

  constructor(private readonly options: OwnershipOptions) {
    this.claimIntervalMs = options.claimIntervalMs ?? 3000;
    this.rebalanceIntervalMs = options.rebalanceIntervalMs ?? 60_000;
    this.fenceMarginMs = options.fenceMarginMs ?? 3000;
    this.lastRebalance = options.clock.now();
  }

  owns(serverId: string): boolean {
    return this.owned.has(serverId);
  }

  ownedIds(): string[] {
    return [...this.owned.keys()];
  }

  async start(): Promise<void> {
    this.stopped = false;
    await this.options.store.heartbeat(
      this.options.workerId,
      this.options.ttlMs,
      this.options.info,
    );
    this.scheduleRenew();
    // The first pass waits one interval, so workers started together see each other first
    this.scheduleClaim(this.claimIntervalMs);
  }

  // Runs a claim pass now, e.g. after a server was created
  claimSoon(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    if (this.claiming) {
      this.claimAgain = true;
      return this.claiming;
    }
    this.claiming = this.claimPass()
      .catch((error) =>
        this.options.log.warn(
          { err: errorMessage(error) },
          "Claim pass failed",
        ),
      )
      .finally(() => {
        this.claiming = null;
        if (this.claimAgain && !this.stopped) {
          this.claimAgain = false;
          void this.claimSoon();
        }
      });
    return this.claiming;
  }

  // Disposes the runtime first, then frees the lease for another worker
  async release(serverId: string, reason: LossReason): Promise<void> {
    if (!this.drop(serverId)) return;
    await this.dispose(serverId, reason);
    await this.options.store
      .release(clusterKeys.lease(serverId), this.options.workerId)
      .catch((error) =>
        this.options.log.warn(
          { err: errorMessage(error), serverId },
          "Could not release lease",
        ),
      );
  }

  async stop(): Promise<void> {
    this.stopped = true;
    const { clock } = this.options;
    if (this.claimTimer) clock.clearTimeout(this.claimTimer);
    if (this.renewTimer) clock.clearTimeout(this.renewTimer);
    this.claimTimer = this.renewTimer = null;
    await this.claiming;
    await Promise.all(
      this.ownedIds().map((id) => this.release(id, "shutdown")),
    );
    await this.options.store
      .dropWorker(this.options.workerId)
      .catch(() => undefined);
  }

  private scheduleClaim(delay: number) {
    if (this.stopped) return;
    this.claimTimer = this.options.clock.setTimeout(async () => {
      await this.claimSoon();
      this.scheduleClaim(this.claimIntervalMs);
    }, delay);
  }

  private scheduleRenew() {
    if (this.stopped) return;
    this.renewTimer = this.options.clock.setTimeout(
      async () => {
        await this.renewPass();
        this.scheduleRenew();
      },
      Math.floor(this.options.ttlMs / 3),
    );
  }

  private async claimPass(): Promise<void> {
    const { store, workerId, clock, ttlMs, isEligible } = this.options;
    const ids = (await this.options.listServers()).filter(isEligible);
    const active = new Set(ids);

    // Servers that were deleted or are no longer ours to run
    for (const id of this.ownedIds()) {
      if (!active.has(id)) await this.release(id, "removed");
    }

    const workers = await store.liveWorkers();
    if (!workers.includes(workerId)) workers.push(workerId);
    const fairShare = Math.ceil(ids.length / workers.length);
    const [owners, holds, assigns] = await Promise.all([
      store.owners(ids.map(clusterKeys.lease)),
      store.owners(ids.map(clusterKeys.hold)),
      store.owners(ids.map(clusterKeys.assign)),
    ]);

    // Normally the hold request releases it; this covers a missed request
    for (const [i, id] of ids.entries()) {
      if (holds[i] !== null && this.owned.has(id))
        await this.release(id, "released");
    }

    const now = clock.now();
    const claimable = (i: number) => owners[i] === null && holds[i] === null;

    // Assignments go first and ignore the fair share: an admin asked for this placement
    for (const [i, id] of ids.entries()) {
      if (this.stopped || !claimable(i) || assigns[i] !== workerId) continue;
      const startedAt = clock.now();
      if (await store.claim(clusterKeys.lease(id), workerId, ttlMs)) {
        this.take(id, startedAt, true);
        await store.deleteFlag(clusterKeys.assign(id)).catch(() => undefined);
      }
    }

    const free = ids.filter(
      (id, i) =>
        claimable(i) &&
        assigns[i] === null &&
        (this.cooldown.get(id) ?? 0) <= now,
    );
    for (const id of this.shuffle(free)) {
      if (this.stopped || this.owned.size >= fairShare) break;
      const startedAt = clock.now();
      if (await store.claim(clusterKeys.lease(id), workerId, ttlMs))
        this.take(id, startedAt);
    }

    if (now - this.lastRebalance >= this.rebalanceIntervalMs) {
      this.lastRebalance = now;
      await this.rebalance(ids, owners, workers, fairShare);
    }
  }

  // Hands one idle server to a less loaded worker; moving a busy one would cut a live match
  private async rebalance(
    ids: string[],
    owners: (string | null)[],
    workers: string[],
    fairShare: number,
  ) {
    const { workerId, clock } = this.options;
    if (this.owned.size <= fairShare) return;

    const counts = new Map(
      workers.filter((w) => w !== workerId).map((w) => [w, 0]),
    );
    owners.forEach((owner) => {
      if (owner && counts.has(owner)) counts.set(owner, counts.get(owner)! + 1);
    });
    const leastLoaded = Math.min(...counts.values());
    if (counts.size === 0 || this.owned.size - leastLoaded < 2) return;

    const idle = ids.find(
      (id) =>
        this.owned.has(id) &&
        !this.owned.get(id)!.assigned &&
        this.options.playerCount(id) === 0,
    );
    if (!idle) return;

    this.options.log.info(
      { serverId: idle, owned: this.owned.size, fairShare },
      "Rebalancing server",
    );
    this.cooldown.set(idle, clock.now() + this.rebalanceIntervalMs * 2);
    await this.release(idle, "released");
  }

  private async renewPass(): Promise<void> {
    if (this.renewing) return;
    this.renewing = true;
    const { store, workerId, clock, ttlMs, log } = this.options;
    try {
      await store
        .heartbeat(workerId, ttlMs, this.options.info)
        .catch((error) =>
          log.warn({ err: errorMessage(error) }, "Worker heartbeat failed"),
        );
      await Promise.all(
        this.ownedIds().map(async (id) => {
          const startedAt = clock.now();
          try {
            const held = await store.renew(
              clusterKeys.lease(id),
              workerId,
              ttlMs,
            );
            if (!this.owned.has(id)) return;
            if (held) {
              this.renewed(id, startedAt);
              this.options.onRenewed?.(id);
            } else await this.lose(id, "lost");
          } catch (error) {
            // The fence timer disposes the runtime if this keeps failing
            log.warn(
              { err: errorMessage(error), serverId: id },
              "Lease renewal failed",
            );
          }
        }),
      );
    } finally {
      this.renewing = false;
    }
  }

  private take(serverId: string, claimedAt: number, assigned = false) {
    this.owned.set(serverId, { renewedAt: claimedAt, fence: null, assigned });
    this.renewed(serverId, claimedAt);
    this.options.log.info({ serverId }, "Claimed server");
    this.options.onOwned(serverId);
  }

  // Our lease runs until at least renewedAt + ttl, so the runtime must be gone before then
  private renewed(serverId: string, at: number) {
    const entry = this.owned.get(serverId);
    if (!entry) return;
    const { clock, ttlMs } = this.options;
    if (entry.fence) clock.clearTimeout(entry.fence);
    entry.renewedAt = at;
    const delay = Math.max(0, at + ttlMs - this.fenceMarginMs - clock.now());
    entry.fence = clock.setTimeout(
      () => void this.lose(serverId, "overdue"),
      delay,
    );
  }

  private async lose(serverId: string, reason: "lost" | "overdue") {
    if (!this.drop(serverId)) return;
    this.options.log.warn(
      { serverId, reason },
      "Lost server lease, disposing runtime",
    );
    await this.dispose(serverId, reason);
  }

  private drop(serverId: string): boolean {
    const entry = this.owned.get(serverId);
    if (!entry) return false;
    if (entry.fence) this.options.clock.clearTimeout(entry.fence);
    this.owned.delete(serverId);
    return true;
  }

  private async dispose(serverId: string, reason: LossReason) {
    await this.options
      .onLost(serverId, reason)
      .catch((error) =>
        this.options.log.error(
          { err: error, serverId },
          "Failed to dispose runtime",
        ),
      );
  }

  private shuffle<T>(items: T[]): T[] {
    const random = this.options.random ?? Math.random;
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
