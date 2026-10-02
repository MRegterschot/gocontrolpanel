import { getRedisClient } from "./redis";

const LUA_SCRIPT = `
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

type RateLimitOptions = {
  key: string;
  ratePerMinute?: number; // default: 60
  burst?: number; // default: 10
  tokenCost?: number; // default: 1
};

export function redisRateLimit(options: RateLimitOptions) {
  return async function <T>(fn: () => Promise<T>): Promise<T> {
    const { key, ratePerMinute = 60, burst = 10, tokenCost = 1 } = options;

    const redis = await getRedisClient();
    const now = Date.now();
    const refillRate = ratePerMinute / 60000; // tokens per ms

    const result = (await redis.eval(
      LUA_SCRIPT,
      1,
      `rate:${key}`,
      now.toString(),
      refillRate.toString(),
      burst.toString(),
      tokenCost.toString(),
    )) as [number, number];
    const [allowed, retryAfter] = result;

    if (allowed === 1) {
      return fn();
    } else {
      return new Promise((resolve) =>
        setTimeout(() => resolve(redisRateLimit(options)(fn)), retryAfter),
      );
    }
  };
}

export function withRateLimit<T>(
  limiterKey: string,
  fn: () => Promise<T>,
  options?: Omit<RateLimitOptions, "key">,
): Promise<T> {
  return redisRateLimit({
    key: limiterKey,
    ratePerMinute: options?.ratePerMinute ?? 60,
    burst: options?.burst ?? 5,
    tokenCost: options?.tokenCost ?? 1,
  })(fn);
}
