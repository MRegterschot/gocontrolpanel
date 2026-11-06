import { errorMessage } from "../errors";
import type { Logger } from "../logger";
import { clusterKeys, type ClusterStore } from "./protocol";

const TTL_MS = 30_000;

// Runs fn on one node at a time; the others wait until it is done (or waitMs passes)
export async function runExclusive(
  store: ClusterStore,
  name: string,
  owner: string,
  fn: () => Promise<void>,
  log: Logger,
  waitMs = 120_000,
): Promise<void> {
  const key = clusterKeys.singleton(name);
  if (await store.claim(key, owner, TTL_MS)) {
    const renew = setInterval(
      () => void store.renew(key, owner, TTL_MS).catch(() => undefined),
      TTL_MS / 3,
    );
    try {
      await fn();
    } finally {
      clearInterval(renew);
      await store.release(key, owner).catch(() => undefined);
    }
    return;
  }

  log.info({ name }, "Another node is running this, waiting for it");
  const until = Date.now() + waitMs;
  while (Date.now() < until) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if ((await store.owners([key]))[0] === null) return;
  }
  log.warn({ name }, "Gave up waiting for another node");
}

// Keeps a background job (the marketplace watcher) running on exactly one front
export class SingletonJob {
  private timer: NodeJS.Timeout | null = null;
  private held = false;

  constructor(
    private readonly store: ClusterStore,
    private readonly name: string,
    private readonly owner: string,
    private readonly job: { start(): void; stop(): void },
    private readonly log: Logger,
  ) {}

  start(): void {
    void this.tick();
    this.timer = setInterval(() => void this.tick(), TTL_MS / 3);
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    if (this.held) {
      this.job.stop();
      this.held = false;
      await this.store
        .release(clusterKeys.singleton(this.name), this.owner)
        .catch(() => undefined);
    }
  }

  private async tick() {
    const key = clusterKeys.singleton(this.name);
    try {
      const held = this.held
        ? await this.store.renew(key, this.owner, TTL_MS)
        : await this.store.claim(key, this.owner, TTL_MS);
      if (held && !this.held) {
        this.log.info(
          { name: this.name },
          "Running singleton job on this node",
        );
        this.job.start();
      } else if (!held && this.held) {
        this.log.warn(
          { name: this.name },
          "Lost singleton job to another node",
        );
        this.job.stop();
      }
      this.held = held;
    } catch (error) {
      this.log.warn(
        { err: errorMessage(error), name: this.name },
        "Singleton lease check failed",
      );
    }
  }
}
