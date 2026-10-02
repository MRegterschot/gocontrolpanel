import type { Logger } from "./logger";

export type EventMap = { [event: string]: unknown[] };
type Listener<Args extends unknown[]> = (...args: Args) => unknown;

// Minimal typed emitter; a failing listener is logged and never affects the others
export class TypedEventBus<M extends EventMap> {
  private readonly listeners = new Map<keyof M, Set<Listener<never[]>>>();

  constructor(private readonly log?: Logger) {}

  on<K extends keyof M>(event: K, listener: Listener<M[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener<never[]>);
    return () => this.off(event, listener);
  }

  off<K extends keyof M>(event: K, listener: Listener<M[K]>): void {
    this.listeners.get(event)?.delete(listener as Listener<never[]>);
  }

  emit<K extends keyof M>(event: K, ...args: M[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;

    for (const listener of [...set]) {
      try {
        const result = (listener as Listener<M[K]>)(...args);
        if (result instanceof Promise) {
          result.catch((error) => this.reportError(event, error));
        }
      } catch (error) {
        this.reportError(event, error);
      }
    }
  }

  listenerCount(event: keyof M): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  clear(): void {
    this.listeners.clear();
  }

  private reportError(event: keyof M, error: unknown) {
    this.log?.error(
      { err: error, event: String(event) },
      "Event listener failed",
    );
  }
}

// Collects teardown callbacks so scoped registrations can be undone in one call
export class CleanupStack {
  private disposers: (() => unknown)[] = [];

  add(disposer: () => unknown): void {
    this.disposers.push(disposer);
  }

  async dispose(): Promise<void> {
    const disposers = this.disposers.reverse();
    this.disposers = [];
    for (const dispose of disposers) {
      await dispose();
    }
  }
}
