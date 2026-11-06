import type { Redis } from "ioredis";

// Token bucket shared across processes (same script and keys as the web app)
const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local capacity = tonumber(ARGV[3])
local tokenCost = tonumber(ARGV[4])

local bucket = redis.call("HMGET", key, "tokens", "lastRefill")
local tokens = tonumber(bucket[1]) or capacity
local lastRefill = tonumber(bucket[2]) or now

local elapsed = now - lastRefill
local refill = elapsed * refillRate
tokens = math.min(capacity, tokens + refill)
local allowed = tokens >= tokenCost

if allowed then
  tokens = tokens - tokenCost
  redis.call("HMSET", key, "tokens", tokens, "lastRefill", now)
  redis.call("EXPIRE", key, 120)
  return {1, 0}
else
  local waitTime = math.ceil((tokenCost - tokens) / refillRate)
  return {0, waitTime}
end
`;

export interface RateLimitOptions {
  ratePerMinute?: number;
  burst?: number;
  tokenCost?: number;
}

export class RedisRateLimiter {
  constructor(private readonly redis: Redis) {}

  async run<T>(key: string, fn: () => Promise<T>, options: RateLimitOptions = {}): Promise<T> {
    const { ratePerMinute = 60, burst = 5, tokenCost = 1 } = options;
    const refillRate = ratePerMinute / 60_000;

    while (true) {
      const [allowed, retryAfter] = (await this.redis.eval(
        TOKEN_BUCKET_SCRIPT,
        1,
        `rate:${key}`,
        Date.now().toString(),
        refillRate.toString(),
        burst.toString(),
        tokenCost.toString(),
      )) as [number, number];

      if (allowed === 1) return fn();
      await new Promise((resolve) => setTimeout(resolve, retryAfter));
    }
  }
}
