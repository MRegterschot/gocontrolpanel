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
  onReconnectScheduled?: (at: number) => void;
  onReconnectStopped?: () => void;
}

// Owns the connect/retry policy: one pending retry at a time, capped retries, reset on success
export class ConnectionSupervisor {
  private _state: SupervisorState = "idle";
  private timer: unknown = null;
  private retryCount = 0;
  private _reconnectAt: number | null = null;
  private readonly retryDelayMs: number;
  private readonly maxRetries: number;

  constructor(private readonly options: SupervisorOptions) {
    this.retryDelayMs = options.retryDelayMs ?? 15_000;
    this.maxRetries = options.maxRetries ?? 10;
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
    return this.attempt();
  }

  // Manual "reconnect now": cancels the pending retry and resets the budget
  async triggerNow(): Promise<boolean> {
    if (this._state === "connected" || this._state === "connecting") {
      return this._state === "connected";
    }
    this.clearTimer();
    this.retryCount = 0;
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

    if (this.retryCount >= this.maxRetries) {
      this.options.log.warn(
        { maxRetries: this.maxRetries },
        "Giving up reconnecting to GBX server",
      );
      this._state = "stopped";
      this._reconnectAt = null;
      this.options.onReconnectStopped?.();
      return;
    }

    this.retryCount += 1;
    this._state = "waiting";
    this._reconnectAt = this.options.clock.now() + this.retryDelayMs;
    this.options.onReconnectScheduled?.(this._reconnectAt);

    this.timer = this.options.clock.setTimeout(() => {
      this.timer = null;
      this._reconnectAt = null;
      void this.attempt();
    }, this.retryDelayMs);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      this.options.clock.clearTimeout(this.timer);
      this.timer = null;
    }
    this._reconnectAt = null;
  }
}
