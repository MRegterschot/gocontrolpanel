import type { EventEmitter } from "node:events";
import { Redis } from "ioredis";
import type { Logger } from "../../core/logger";

const RETRY_STEP_MS = 500;
const MAX_RETRY_DELAY_MS = 5_000;

// Keeps retrying for as long as Redis is gone, so the service recovers on its own once it is back
export function redisRetryDelay(attempt: number): number {
  return Math.min(attempt * RETRY_STEP_MS, MAX_RETRY_DELAY_MS);
}

export function createRedis(url: string, log: Logger, name: string): Redis {
  const redis = new Redis(url, { maxRetriesPerRequest: 3, retryStrategy: redisRetryDelay });
  watchRedisConnection(redis, log.child({ module: "redis", connection: name }));
  return redis;
}

// Logs an outage once and its recovery once, instead of an unhandled error event per retry
export function watchRedisConnection(redis: EventEmitter, log: Logger): void {
  let down = false;

  redis.on("error", (error: Error) => {
    if (down) {
      log.debug({ err: error }, "Redis still unavailable");
      return;
    }
    down = true;
    log.warn({ err: error }, "Redis unavailable, retrying in the background");
  });

  redis.on("ready", () => {
    if (!down) return;
    down = false;
    log.info("Redis connection restored");
  });
}
