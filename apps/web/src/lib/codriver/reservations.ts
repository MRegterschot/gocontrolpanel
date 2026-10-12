import { getRedisClient } from "@/lib/redis";
import "server-only";
import type { BudgetScope } from "./access";
import { maxCallMicros, monthStart, type BudgetState } from "./usage";

// Budgets are summed from recorded requests, which are only written when a request finishes.
// Requests in flight therefore reserve their worst-case cost first, atomically across every
// budget they count against, so concurrent requests can't all pass the same remaining budget.
// A budget can still be exceeded by at most one request's actual cost beyond its reservation.

const RESERVATION_TTL_SECONDS = 15 * 60;

// Checks every budget, then reserves on all of them, or on none
const RESERVE = `
for i, key in ipairs(KEYS) do
  local reserved = tonumber(redis.call("GET", key) or "0")
  if tonumber(ARGV[i * 2 - 1]) + reserved + tonumber(ARGV[#ARGV]) > tonumber(ARGV[i * 2]) then
    return 0
  end
end
for _, key in ipairs(KEYS) do
  redis.call("INCRBY", key, ARGV[#ARGV])
  redis.call("EXPIRE", key, ${RESERVATION_TTL_SECONDS})
end
return 1
`;

const RELEASE = `
for _, key in ipairs(KEYS) do
  local left = redis.call("DECRBY", key, ARGV[1])
  if left <= 0 then redis.call("DEL", key) end
end
return 1
`;

function reservationKey(scope: BudgetScope, serverId: string): string {
  const month = monthStart().toISOString().slice(0, 7);
  const owner = scope === "shared-global" ? "global" : serverId;
  return `codriver:reserved:${scope}:${owner}:${month}`;
}

// Worst case for one request: every step may make the runner's model calls on the dearer model
export function reservationMicros(models: string[], steps: number): number {
  const perCall = Math.max(...models.map(maxCallMicros));
  return perCall * CALLS_PER_STEP * Math.max(1, steps);
}

// Planning, an escalation and a summary
const CALLS_PER_STEP = 3;

export type Release = () => Promise<void>;

// Reserves micros on every budget; returns the release, or null when a budget has no room.
// Release only after the request is recorded, so its cost is always counted by one of the two.
export async function reserveBudget(
  serverId: string,
  budgets: BudgetState[],
  micros: number,
): Promise<Release | null> {
  if (budgets.length === 0) return async () => {};

  const redis = await getRedisClient();
  const keys = budgets.map((state) =>
    reservationKey(state.budget.scope, serverId),
  );
  const args = budgets.flatMap((state) => [
    String(state.spentMicros),
    String(state.budget.limitCents * 10_000),
  ]);
  const reserved = await redis.eval(
    RESERVE,
    keys.length,
    ...keys,
    ...args,
    String(micros),
  );
  if (reserved !== 1) return null;

  let released = false;
  return async () => {
    if (released) return;
    released = true;
    await redis.eval(RELEASE, keys.length, ...keys, String(micros));
  };
}
