import type { Logger } from "../logger";
import type { Clock } from "../ports";

export type SupervisorState =
  | "idle"
  | "connecting"
  | "connected"
  | "waiting"
  | "stopped";

export interface SupervisorOptions {
  connect: () => Promise<void>;
  clock: Clock;
  log: Logger;
  retryDelayMs?: number;
  maxRetries?: number;
  // A server that never connected (a cloud VM that is still booting) keeps retrying every
  // slowRetryDelayMs after the normal retries, until this long after the first attempt
  initialConnectWindowMs?: number;
  slowRetryDelayMs?: number;
  onReconnectScheduled?: (at: number) => void;
  onReconnectStopped?: () => void;
}

// Owns the connect/retry policy: one pending retry at a time, capped retries, reset on success.
// A server that has connected before gives up after maxRetries; one that never has gets a longer window.
export class ConnectionSupervisor {
  private _state: SupervisorState = "idle";
  private timer: unknown = null;
  private retryCount = 0;
  private _reconnectAt: number | null = null;
  private readonly retryDelayMs: number;
  private readonly maxRetries: number;
  private readonly initialConnectWindowMs: number;
  private readonly slowRetryDelayMs: number;
  private hasConnected = false;
  // When the current connect effort began (start() or a manual reconnect)
  private effortStartedAt = 0;

  constructor(private readonly options: SupervisorOptions) {
    this.retryDelayMs = options.retryDelayMs ?? 15_000;
    this.maxRetries = options.maxRetries ?? 10;
    this.initialConnectWindowMs = options.initialConnectWindowMs ?? 15 * 60_000;
    this.slowRetryDelayMs = options.slowRetryDelayMs ?? 60_000;
  }

  get state(): SupervisorState {
    return this._state;
  }

  get reconnectAt(): number | null {
    return this._reconnectAt;
  }

  get retries(): number {
    return this.retryCount;
  }

  // Attempts a connection now; schedules a retry on failure. No-op while connected or connecting.
  async start(): Promise<boolean> {
    if (this._state === "connected" || this._state === "connecting") {
      return this._state === "connected";
    }
    this.clearTimer();
    this.effortStartedAt = this.options.clock.now();
    return this.attempt();
  }

  // Manual "reconnect now": cancels the pending retry and resets the budget
  async triggerNow(): Promise<boolean> {
    if (this._state === "connected" || this._state === "connecting") {
      return this._state === "connected";
    }
    this.clearTimer();
    this.retryCount = 0;
    this.effortStartedAt = this.options.clock.now();
    return this.attempt();
  }

  handleConnectionLost(): void {
    if (this._state === "stopped") return;
    this._state = "idle";
    this.schedule();
  }

  // Stops retrying until start()/triggerNow() is called again
  stop(): void {
    this.clearTimer();
    this._state = "stopped";
    this.options.onReconnectStopped?.();
  }

  private async attempt(): Promise<boolean> {
    this._state = "connecting";
    try {
      await this.options.connect();
      this._state = "connected";
      this.hasConnected = true;
      this.retryCount = 0;
      this._reconnectAt = null;
      return true;
    } catch (error) {
      this.options.log.warn(
        {
          err: error,
          retryCount: this.retryCount,
          maxRetries: this.maxRetries,
        },
        "Failed to connect to GBX server",
      );
      // A stop() during the attempt wins over the retry
      if ((this._state as SupervisorState) !== "stopped") {
        this._state = "idle";
        this.schedule();
      }
      return false;
    }
  }

  private schedule(): void {
    if (this.timer !== null) return;

    const delay = this.nextDelay();
    if (delay === null) {
      this.options.log.warn(
        { maxRetries: this.maxRetries, hasConnected: this.hasConnected },
        "Giving up reconnecting to GBX server",
      );
      this._state = "stopped";
      this._reconnectAt = null;
      this.options.onReconnectStopped?.();
      return;
    }

    this.retryCount += 1;
    this._state = "waiting";
    this._reconnectAt = this.options.clock.now() + delay;
    this.options.onReconnectScheduled?.(this._reconnectAt);

    this.timer = this.options.clock.setTimeout(() => {
      this.timer = null;
      this._reconnectAt = null;
      void this.attempt();
    }, delay);
  }

  // Delay before the next retry, or null when it is time to give up
  private nextDelay(): number | null {
    if (this.retryCount < this.maxRetries) return this.retryDelayMs;
    if (this.hasConnected) return null;

    const elapsed = this.options.clock.now() - this.effortStartedAt;
    return elapsed + this.slowRetryDelayMs <= this.initialConnectWindowMs
      ? this.slowRetryDelayMs
      : null;
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      this.options.clock.clearTimeout(this.timer);
      this.timer = null;
    }
    this._reconnectAt = null;
  }
}
