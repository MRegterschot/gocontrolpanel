import { getRedisClient } from "@/lib/redis";
import { randomUUID } from "node:crypto";
import "server-only";
import type { PlannedCall } from "./types";

// How long a confirmation question stays open
export const PENDING_TTL_SECONDS = 60;

type Source = "game" | "panel" | "cli";
const pendingKey = (serverId: string, login: string, source: Source) =>
  `codriver:pending:${source}:${serverId}:${login}`;
const cooldownKey = (serverId: string, login: string) =>
  `codriver:cooldown:${serverId}:${login}`;

// Stores the validated calls, not the text, so "yes" runs exactly what was shown
export async function savePending(
  serverId: string,
  login: string,
  calls: PlannedCall[],
  source: Source = "game",
): Promise<string> {
  const redis = await getRedisClient();
  const id = randomUUID();
  await redis.set(
    pendingKey(serverId, login, source),
    JSON.stringify({ id, calls }),
    "EX",
    PENDING_TTL_SECONDS,
  );
  return id;
}

// Returns and removes the pending calls in one step, so a double "yes" runs them once
export async function takePending(
  serverId: string,
  login: string,
  source: Source = "game",
  expectedId?: string,
): Promise<PlannedCall[] | null> {
  const redis = await getRedisClient();
  const key = pendingKey(serverId, login, source);
  const value = await redis.eval(
    `
    local value = redis.call('GET', KEYS[1])
    if not value then return nil end
    local pending = cjson.decode(value)
    if ARGV[1] ~= '' and pending.id ~= ARGV[1] then return nil end
    redis.call('DEL', KEYS[1])
    return cjson.encode(pending.calls)
  `,
    1,
    key,
    expectedId ?? "",
  );
  return typeof value === "string"
    ? (JSON.parse(value) as PlannedCall[])
    : null;
}

export async function clearPending(
  serverId: string,
  login: string,
  source: Source = "game",
): Promise<boolean> {
  const redis = await getRedisClient();
  return (await redis.del(pendingKey(serverId, login, source))) > 0;
}

// False when the player sent a request less than `seconds` ago
export async function takeCooldown(
  serverId: string,
  login: string,
  seconds: number,
): Promise<boolean> {
  if (seconds <= 0) return true;
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
