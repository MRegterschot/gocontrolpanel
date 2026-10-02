import type { Clock } from "../../src/core/ports";

interface Timer {
  id: number;
  at: number;
  fn: () => void;
}

// Deterministic clock: timers only fire on advance(); sleep() resolves immediately
export class FakeClock implements Clock {
  private current = 1_000_000;
  private timers: Timer[] = [];
  private nextId = 1;

  now(): number {
    return this.current;
  }

  setTimeout(fn: () => void, ms: number): unknown {
    const timer = { id: this.nextId++, at: this.current + ms, fn };
    this.timers.push(timer);
    return timer.id;
  }

  clearTimeout(handle: unknown): void {
    this.timers = this.timers.filter((timer) => timer.id !== handle);
  }

  async sleep(): Promise<void> {}

  pendingTimers(): number {
    return this.timers.length;
  }

  // Fires due timers in order, letting async work started by them settle
  async advance(ms: number): Promise<void> {
    const target = this.current + ms;
    while (true) {
      const due = this.timers.filter((t) => t.at <= target).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      this.timers = this.timers.filter((t) => t !== due);
      this.current = due.at;
      due.fn();
      await flush();
    }
    this.current = target;
  }
}

// Lets pending promise chains run
export async function flush(times = 10): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}
