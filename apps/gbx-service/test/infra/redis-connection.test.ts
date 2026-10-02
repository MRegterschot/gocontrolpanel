import { EventEmitter } from "node:events";
import pino from "pino";
import { describe, expect, it } from "vitest";
import { redisRetryDelay, watchRedisConnection } from "../../src/infra/redis/redis";

function recordingLogger() {
  const lines: { level: number; msg: string }[] = [];
  const log = pino({ level: "debug" }, { write: (line: string) => lines.push(JSON.parse(line)) });
  return { log, messages: (minLevel = 0) => lines.filter((l) => l.level >= minLevel).map((l) => l.msg) };
}

describe("redisRetryDelay", () => {
  it("backs off linearly and never gives up", () => {
    expect(redisRetryDelay(1)).toBe(500);
    expect(redisRetryDelay(4)).toBe(2_000);
    expect(redisRetryDelay(10)).toBe(5_000);
    expect(redisRetryDelay(10_000)).toBe(5_000);
  });
});

describe("watchRedisConnection", () => {
  it("logs one warning per outage and one line on recovery", () => {
    const redis = new EventEmitter();
    const { log, messages } = recordingLogger();
    watchRedisConnection(redis, log);

    redis.emit("ready");
    for (let i = 0; i < 5; i++) redis.emit("error", new Error("connect ECONNREFUSED"));
    redis.emit("ready");
    redis.emit("error", new Error("connect ECONNREFUSED"));

    // info and above: what a default LOG_LEVEL shows
    expect(messages(30)).toEqual([
      "Redis unavailable, retrying in the background",
      "Redis connection restored",
      "Redis unavailable, retrying in the background",
    ]);
  });

  it("handles error events so ioredis doesn't print them as unhandled", () => {
    const redis = new EventEmitter();
    watchRedisConnection(redis, recordingLogger().log);
    expect(() => redis.emit("error", new Error("boom"))).not.toThrow();
  });
});
