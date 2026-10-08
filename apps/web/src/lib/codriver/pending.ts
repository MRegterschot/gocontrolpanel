import { getRedisClient } from "@/lib/redis";
import "server-only";
import type { PlannedCall } from "./types";

// How long a confirmation question stays open
export const PENDING_TTL_SECONDS = 60;

const pendingKey = (serverId: string, login: string) =>
  `codriver:pending:${serverId}:${login}`;
const cooldownKey = (serverId: string, login: string) =>
  `codriver:cooldown:${serverId}:${login}`;

// Stores the validated calls, not the text, so "yes" runs exactly what was shown
export async function savePending(
  serverId: string,
  login: string,
  calls: PlannedCall[],
): Promise<void> {
  const redis = await getRedisClient();
  await redis.set(
    pendingKey(serverId, login),
    JSON.stringify(calls),
    "EX",
    PENDING_TTL_SECONDS,
  );
}

// Returns and removes the pending calls in one step, so a double "yes" runs them once
export async function takePending(
  serverId: string,
  login: string,
): Promise<PlannedCall[] | null> {
  const redis = await getRedisClient();
  const key = pendingKey(serverId, login);
  const result = await redis.multi().get(key).del(key).exec();
  const value = result?.[0]?.[1];
  return typeof value === "string"
    ? (JSON.parse(value) as PlannedCall[])
    : null;
}

export async function clearPending(
  serverId: string,
  login: string,
): Promise<boolean> {
  const redis = await getRedisClient();
  return (await redis.del(pendingKey(serverId, login))) > 0;
}

// False when the player sent a request less than `seconds` ago
export async function takeCooldown(
  serverId: string,
  login: string,
  seconds: number,
): Promise<boolean> {
  const redis = await getRedisClient();
  return (
    (await redis.set(
      cooldownKey(serverId, login),
      "1",
      "EX",
      seconds,
      "NX",
    )) === "OK"
  );
}
