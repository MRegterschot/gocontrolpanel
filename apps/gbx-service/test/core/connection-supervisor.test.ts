import { describe, expect, it, vi } from "vitest";
import {
  ConnectionSupervisor,
  type SupervisorOptions,
} from "../../src/core/server/connection-supervisor";
import { FakeClock } from "../fakes/clock";
import { silentLogger } from "../fakes/logger";

function setup(
  connect: () => Promise<void>,
  maxRetries = 3,
  extra: Partial<SupervisorOptions> = {},
) {
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
    ...extra,
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

  it("gives up after max retries when the extra window is disabled", async () => {
    const { clock, supervisor, stopped } = setup(
      async () => {
        throw new Error("down");
      },
      2,
      { initialConnectWindowMs: 0 },
    );

    await supervisor.start();
    await clock.advance(15_000);
    await clock.advance(15_000);

    expect(supervisor.state).toBe("stopped");
    expect(supervisor.reconnectAt).toBeNull();
    expect(stopped).toHaveBeenCalledTimes(1);
    expect(clock.pendingTimers()).toBe(0);
  });

  it("keeps the normal retry budget for a server that connected before", async () => {
    let up = true;
    const connect = vi.fn(async () => {
      if (!up) throw new Error("down");
    });
    const { clock, supervisor, stopped, scheduled } = setup(connect);

    await supervisor.start();
    up = false;
    const lostAt = clock.now();
    supervisor.handleConnectionLost();
    await clock.advance(15_000);
    await clock.advance(15_000);
    await clock.advance(15_000);

    // Three retries, all 15 s apart, then it stops: no slow phase after a real outage
    expect(connect).toHaveBeenCalledTimes(4);
    expect(scheduled.map((at) => (at - lostAt) / 1000)).toEqual([15, 30, 45]);
    expect(supervisor.state).toBe("stopped");
    expect(stopped).toHaveBeenCalledTimes(1);
  });

  describe("a server that has never connected (still booting)", () => {
    const extra = { initialConnectWindowMs: 600_000, slowRetryDelayMs: 60_000 };

    it("retries every 15 s first, then every minute, until the window is over", async () => {
      const connect = vi.fn(async () => {
        throw new Error("down");
      });
      const { clock, supervisor, scheduled, stopped } = setup(connect, 3, extra);
      const startedAt = clock.now();

      await supervisor.start();
      await clock.advance(600_000);

      // 3 retries 15 s apart, then one per minute while a retry still fits in the 10 minute window
      const seconds = (list: number[]) => list.map((at) => (at - startedAt) / 1000);
      expect(seconds(scheduled)).toEqual([
        15, 30, 45,
        105, 165, 225, 285, 345, 405, 465, 525, 585,
      ]);
      expect(supervisor.state).toBe("stopped");
      expect(stopped).toHaveBeenCalledTimes(1);
      expect(clock.pendingTimers()).toBe(0);
      expect(clock.now() - startedAt).toBeLessThanOrEqual(600_000);
    });

    it("connects as soon as the server comes up and then uses the normal budget", async () => {
      let sessions = 0;
      let up = false;
      const connect = vi.fn(async () => {
        sessions += 1;
        if (!up && sessions < 8) throw new Error("booting");
        up = true;
      });
      const { clock, supervisor, stopped } = setup(connect, 3, extra);

      expect(await supervisor.start()).toBe(false);
      for (let i = 0; i < 40 && supervisor.state !== "connected"; i++) {
        await clock.advance(15_000);
      }
      expect(supervisor.state).toBe("connected");
      expect(supervisor.reconnectAt).toBeNull();
      expect(stopped).not.toHaveBeenCalled();

      // A later outage is an outage of a known-good server: three retries, no slow phase
      up = false;
      connect.mockImplementation(async () => {
        throw new Error("down again");
      });
      connect.mockClear();
      supervisor.handleConnectionLost();
      await clock.advance(45_000);
      await clock.advance(60_000);
      expect(connect).toHaveBeenCalledTimes(3);
      expect(supervisor.state).toBe("stopped");
    });

    it("a manual reconnect after giving up starts a fresh window", async () => {
      const { clock, supervisor } = setup(
        async () => {
          throw new Error("down");
        },
        1,
        { initialConnectWindowMs: 100_000, slowRetryDelayMs: 30_000 },
      );

      await supervisor.start();
      await clock.advance(100_000);
      expect(supervisor.state).toBe("stopped");

      await supervisor.triggerNow();
      expect(supervisor.state).toBe("waiting");
      expect(supervisor.reconnectAt).toBe(clock.now() + 15_000);
    });
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
