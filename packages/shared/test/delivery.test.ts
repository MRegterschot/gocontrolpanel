import { describe, expect, it, vi } from "vitest";
import { deliverServerEvent, type EventTransport } from "../src/server-events";

const event = { type: "server.deleted", serverId: "s1" } as const;

const ok = (name: string): EventTransport & { send: ReturnType<typeof vi.fn> } => ({
  name,
  send: vi.fn(async () => {}),
});
const failing = (name: string, error = new Error(`${name} down`)) => ({
  name,
  send: vi.fn(async () => {
    throw error;
  }),
});

describe("deliverServerEvent", () => {
  it("stops at the first transport that accepts the event", async () => {
    const http = ok("http");
    const redis = ok("redis");

    const result = await deliverServerEvent(event, [http, redis]);

    expect(result).toEqual({ deliveredBy: "http", failures: [] });
    expect(http.send).toHaveBeenCalledWith(event);
    expect(redis.send).not.toHaveBeenCalled();
  });

  it("falls back to the next transport and reports what failed", async () => {
    const error = new Error("connection refused");
    const redis = ok("redis");

    const result = await deliverServerEvent(event, [failing("http", error), redis]);

    expect(result.deliveredBy).toBe("redis");
    expect(result.failures).toEqual([{ transport: "http", error }]);
    expect(redis.send).toHaveBeenCalledWith(event);
  });

  it("reports every failure when nothing accepts the event", async () => {
    const result = await deliverServerEvent(event, [failing("http"), failing("redis")]);

    expect(result.deliveredBy).toBeNull();
    expect(result.failures.map((f) => f.transport)).toEqual(["http", "redis"]);
  });

  it("tries transports one after the other, never in parallel", async () => {
    const order: string[] = [];
    const slow: EventTransport = {
      name: "http",
      send: async () => {
        order.push("http:start");
        await new Promise((resolve) => setTimeout(resolve, 5));
        order.push("http:end");
        throw new Error("timeout");
      },
    };
    const next: EventTransport = {
      name: "redis",
      send: async () => {
        order.push("redis");
      },
    };

    await deliverServerEvent(event, [slow, next]);

    expect(order).toEqual(["http:start", "http:end", "redis"]);
  });

  it("does not throw with no transports", async () => {
    expect(await deliverServerEvent(event, [])).toEqual({ deliveredBy: null, failures: [] });
  });
});
