// Resource limits of one sandboxed plugin on one server (PM-12)
export interface SandboxLimits {
  memoryBytes: number;
  stackBytes: number;
  // Evaluating the bundle and running create()
  loadMs: number;
  // One event, command, action, timer or promise continuation
  entryMs: number;
  // CPU of all entries together within a minute
  cpuPerMinuteMs: number;
  // How long start() and stop() may wait on async work
  hookTimeoutMs: number;
  maxPendingCalls: number;
  maxTimers: number;
  maxHandlers: number;
  maxPages: number;
  maxArgBytes: number;
  maxManialinkBytes: number;
  maxLogBytes: number;
  // Over these the plugin is turned off
  errorsPerMinute: number;
  rejectionsPerMinute: number;
  storage: { maxKeys: number; maxBytes: number; maxValueBytes: number; maxKeyLength: number };
  http: { timeoutMs: number; maxTimeoutMs: number; maxRequestBytes: number; maxResponseBytes: number };
}

export const DEFAULT_SANDBOX_LIMITS: SandboxLimits = {
  memoryBytes: 32 * 1024 * 1024,
  stackBytes: 1024 * 1024,
  loadMs: 2000,
  entryMs: 100,
  cpuPerMinuteMs: 6000,
  hookTimeoutMs: 10_000,
  maxPendingCalls: 100,
  maxTimers: 100,
  maxHandlers: 1000,
  maxPages: 200,
  maxArgBytes: 1024 * 1024,
  maxManialinkBytes: 128 * 1024,
  maxLogBytes: 4 * 1024,
  errorsPerMinute: 100,
  rejectionsPerMinute: 300,
  storage: { maxKeys: 1000, maxBytes: 1024 * 1024, maxValueBytes: 64 * 1024, maxKeyLength: 128 },
  http: { timeoutMs: 10_000, maxTimeoutMs: 30_000, maxRequestBytes: 256 * 1024, maxResponseBytes: 1024 * 1024 },
};

export interface RateLimit {
  burst: number;
  perSecond: number;
}

export const RATE_LIMITS = {
  gbx: { burst: 50, perSecond: 20 },
  chat: { burst: 10, perSecond: 2 },
  ui: { burst: 100, perSecond: 40 },
  storageWrite: { burst: 50, perSecond: 10 },
  http: { burst: 10, perSecond: 1 },
  nadeo: { burst: 10, perSecond: 1 },
  notify: { burst: 3, perSecond: 1 / 60 },
} satisfies Record<string, RateLimit>;

export type RateLimitName = keyof typeof RATE_LIMITS;

export class TokenBucket {
  private tokens: number;
  private last: number;

  constructor(
    private readonly limit: RateLimit,
    private readonly now: () => number,
  ) {
    this.tokens = limit.burst;
    this.last = now();
  }

  take(): boolean {
    const current = this.now();
    const elapsed = Math.max(0, current - this.last) / 1000;
    this.last = current;
    this.tokens = Math.min(this.limit.burst, this.tokens + elapsed * this.limit.perSecond);
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}

// Sums values over the last minute in one-second slots
export class MinuteCounter {
  private readonly slots = new Map<number, number>();

  constructor(private readonly now: () => number) {}

  add(amount = 1): number {
    const second = Math.floor(this.now() / 1000);
    this.slots.set(second, (this.slots.get(second) ?? 0) + amount);
    let total = 0;
    for (const [slot, value] of this.slots) {
      if (slot <= second - 60) this.slots.delete(slot);
      else total += value;
    }
    return total;
  }
}
