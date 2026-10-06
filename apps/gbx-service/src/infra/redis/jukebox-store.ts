import { redisKeys, type JukeboxEntry } from "@gcp/shared";
import type { Redis } from "ioredis";
import type { JukeboxStore } from "../../core/ports";

export class RedisJukeboxStore implements JukeboxStore {
  constructor(private readonly redis: Redis) {}

  async peek(serverId: string): Promise<JukeboxEntry | null> {
    const raw = await this.redis.lindex(redisKeys.jukebox(serverId), 0);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as JukeboxEntry;
    } catch {
      return null;
    }
  }

  async pop(serverId: string): Promise<void> {
    await this.redis.lpop(redisKeys.jukebox(serverId));
  }
}
