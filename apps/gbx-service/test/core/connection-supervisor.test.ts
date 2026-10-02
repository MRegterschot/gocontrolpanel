import { describe, expect, it, vi } from "vitest";
import { ConnectionSupervisor } from "../../src/core/server/connection-supervisor";
import { FakeClock } from "../fakes/clock";
import { silentLogger } from "../fakes/logger";

function setup(connect: () => Promise<void>, maxRetries = 3) {
  const clock = new FakeClock();
  const scheduled: number[] = [];
  const stopped = vi.fn();
  const supervisor = new ConnectionSupervisor({
    connect,
    clock,
    log: silentLogger,
    retryDelayMs: 15_000,
    maxRetries,
    onReconnectScheduled: (at) => scheduled.push(at),
    onReconnectStopped: stopped,
  });
  return { clock, supervisor, scheduled, stopped };
}

describe("ConnectionSupervisor", () => {
  it("connects immediately when the server is reachable", async () => {
    const { supervisor, scheduled } = setup(async () => {});
    expect(await supervisor.start()).toBe(true);
    expect(supervisor.state).toBe("connected");
    expect(scheduled).toEqual([]);
  });

  it("retries every delay until it succeeds and resets the budget", async () => {
    let failures = 2;
    const connect = vi.fn(async () => {
      if (failures-- > 0) throw new Error("down");
    });
    const { clock, supervisor, scheduled } = setup(connect);

    expect(await supervisor.start()).toBe(false);
    expect(supervisor.state).toBe("waiting");
    expect(supervisor.reconnectAt).toBe(clock.now() + 15_000);

    await clock.advance(15_000);
    expect(supervisor.state).toBe("waiting");
    await clock.advance(15_000);

    expect(supervisor.state).toBe("connected");
    expect(connect).toHaveBeenCalledTimes(3);
    expect(scheduled).toHaveLength(2);
    expect(supervisor.retries).toBe(0);
    expect(supervisor.reconnectAt).toBeNull();
  });

  it("gives up after max retries and reports it", async () => {
    const { clock, supervisor, stopped } = setup(async () => {
      throw new Error("down");
    }, 2);

    await supervisor.start();
    await clock.advance(15_000);
    await clock.advance(15_000);

    expect(supervisor.state).toBe("stopped");
    expect(supervisor.reconnectAt).toBeNull();
    expect(stopped).toHaveBeenCalledTimes(1);
    expect(clock.pendingTimers()).toBe(0);
  });

  it("schedules a reconnect when a live connection drops", async () => {
    const { supervisor, scheduled } = setup(async () => {});
    await supervisor.start();
    supervisor.handleConnectionLost();
    expect(supervisor.state).toBe("waiting");
    expect(scheduled).toHaveLength(1);
  });

  it("never schedules two retries at once", async () => {
    const { clock, supervisor } = setup(async () => {
      throw new Error("down");
    });
    await supervisor.start();
    supervisor.handleConnectionLost();
    expect(clock.pendingTimers()).toBe(1);
  });

  it("stop() cancels retries and ignores later drops", async () => {
    const { clock, supervisor, stopped } = setup(async () => {
      throw new Error("down");
    });
    await supervisor.start();
    supervisor.stop();
    supervisor.handleConnectionLost();

    expect(stopped).toHaveBeenCalled();
    expect(clock.pendingTimers()).toBe(0);
    expect(supervisor.reconnectAt).toBeNull();
  });

  it("triggerNow() cancels the pending retry and tries immediately", async () => {
    let fail = true;
    const { clock, supervisor } = setup(async () => {
      if (fail) throw new Error("down");
    });
    await supervisor.start();
    fail = false;

    expect(await supervisor.triggerNow()).toBe(true);
    expect(clock.pendingTimers()).toBe(0);
    expect(supervisor.state).toBe("connected");
  });
});
