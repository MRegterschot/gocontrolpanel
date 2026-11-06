import { getRedisClient } from "@/lib/redis";
import "server-only";

type Source = "game" | "panel" | "cli";

// A running request outlives its slowest step, so a crashed process can't block a player for long
const RUNNING_TTL_SECONDS = 120;
const CANCEL_TTL_SECONDS = 30;
const POLL_MS = 500;

const runningKey = (serverId: string, login: string, source: Source) =>
  `codriver:running:${source}:${serverId}:${login}`;
const cancelKey = (serverId: string, login: string, source: Source) =>
  `codriver:cancel:${source}:${serverId}:${login}`;

export interface RunningRequest {
  // Aborted when the player cancels
  signal: AbortSignal;
  finish(): Promise<void>;
}

// Marks a request as running and watches for a cancel from another call, in any process
export async function startRunning(
  serverId: string,
  login: string,
  source: Source,
): Promise<RunningRequest> {
  const redis = await getRedisClient();
  const controller = new AbortController();
  // A stale flag from an earlier request must not cancel this one
  await redis.del(cancelKey(serverId, login, source));
  await redis.set(
    runningKey(serverId, login, source),
    "1",
    "EX",
    RUNNING_TTL_SECONDS,
  );

  let polling = false;
  const timer = setInterval(() => {
    if (polling || controller.signal.aborted) return;
    polling = true;
    redis
      .get(cancelKey(serverId, login, source))
      .then((flag) => {
        if (flag) controller.abort();
      })
      // A Redis hiccup just means this check is skipped
      .catch(() => {})
      .finally(() => {
        polling = false;
      });
  }, POLL_MS);

  return {
    signal: controller.signal,
    async finish() {
      clearInterval(timer);
      await redis
        .del(
          runningKey(serverId, login, source),
          cancelKey(serverId, login, source),
        )
        .catch(() => {});
    },
  };
}

// True when the player had a request running, which now stops at its next checkpoint
export async function requestCancel(
  serverId: string,
  login: string,
  source: Source,
): Promise<boolean> {
  const redis = await getRedisClient();
  if (!(await redis.exists(runningKey(serverId, login, source)))) return false;
  await redis.set(
    cancelKey(serverId, login, source),
    "1",
    "EX",
    CANCEL_TTL_SECONDS,
  );
  return true;
}
