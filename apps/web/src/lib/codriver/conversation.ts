import { getLogger } from "@/lib/logger";
import { getRedisClient } from "@/lib/redis";
import "server-only";

// Most turns kept per player; the server setting picks how many the model sees
export const MAX_TURNS = 10;
export const CONVERSATION_TTL_SECONDS = 15 * 60;
const MAX_TURN_LENGTH = 300;

export interface Turn {
  request: string;
  reply: string;
}

type Source = "game" | "panel" | "cli";
const key = (serverId: string, login: string, source: Source) =>
  `codriver:conversation:${source}:${serverId}:${login}`;

// Memory is best effort: a Redis problem must never block a request
export async function loadTurns(
  serverId: string,
  login: string,
  source: Source,
  limit: number = MAX_TURNS,
): Promise<Turn[]> {
  if (limit <= 0) return [];
  try {
    const redis = await getRedisClient();
    const items = await redis.lrange(
      key(serverId, login, source),
      -Math.min(limit, MAX_TURNS),
      -1,
    );
    return items.flatMap((item) => {
      try {
        return [JSON.parse(item) as Turn];
      } catch {
        return [];
      }
    });
  } catch (error) {
    getLogger(serverId).warn({ error }, "Loading Codriver conversation failed");
    return [];
  }
}

export async function appendTurn(
  serverId: string,
  login: string,
  source: Source,
  turn: Turn,
): Promise<void> {
  try {
    const redis = await getRedisClient();
    const k = key(serverId, login, source);
    await redis
      .multi()
      .rpush(
        k,
        JSON.stringify({
          request: turn.request.slice(0, MAX_TURN_LENGTH),
          reply: turn.reply.slice(0, MAX_TURN_LENGTH),
        }),
      )
      .ltrim(k, -MAX_TURNS, -1)
      .expire(k, CONVERSATION_TTL_SECONDS)
      .exec();
  } catch (error) {
    getLogger(serverId).warn({ error }, "Saving Codriver conversation failed");
  }
}

export async function clearTurns(
  serverId: string,
  login: string,
  source: Source,
): Promise<void> {
  try {
    const redis = await getRedisClient();
    await redis.del(key(serverId, login, source));
  } catch (error) {
    getLogger(serverId).warn(
      { error },
      "Clearing Codriver conversation failed",
    );
  }
}
