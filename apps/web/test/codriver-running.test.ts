import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A tiny in-memory stand-in for the Redis calls the module makes
const store = vi.hoisted(() => new Map<string, string>());
vi.mock("server-only", () => ({}));
vi.mock("@/lib/redis", () => ({
  getRedisClient: async () => ({
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: string) => void store.set(key, value),
    del: async (...keys: string[]) =>
      keys.reduce((n, key) => n + (store.delete(key) ? 1 : 0), 0),
    exists: async (key: string) => (store.has(key) ? 1 : 0),
  }),
}));

import { requestCancel, startRunning } from "@/lib/codriver/running";

beforeEach(() => {
  store.clear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("running requests", () => {
  it("aborts the running request when asked to cancel", async () => {
    const running = await startRunning("s", "l", "game");
    expect(running.signal.aborted).toBe(false);
    expect(await requestCancel("s", "l", "game")).toBe(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(running.signal.aborted).toBe(true);
    await running.finish();
  });

  it("has nothing to cancel when no request runs", async () => {
    expect(await requestCancel("s", "l", "game")).toBe(false);
  });

  it("keeps requests of other players and sources apart", async () => {
    const running = await startRunning("s", "l", "game");
    expect(await requestCancel("s", "other", "game")).toBe(false);
    expect(await requestCancel("s", "l", "panel")).toBe(false);
    await vi.advanceTimersByTimeAsync(1000);
    expect(running.signal.aborted).toBe(false);
    await running.finish();
  });

  it("forgets the request when it finishes", async () => {
    const running = await startRunning("s", "l", "game");
    await running.finish();
    expect(await requestCancel("s", "l", "game")).toBe(false);
    expect(store.size).toBe(0);
  });

  it("ignores a stale cancel left from an earlier request", async () => {
    store.set("codriver:cancel:game:s:l", "1");
    const running = await startRunning("s", "l", "game");
    await vi.advanceTimersByTimeAsync(1000);
    expect(running.signal.aborted).toBe(false);
    await running.finish();
  });
});
