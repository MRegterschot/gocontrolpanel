import { doServerActionWithAuth } from "@/lib/actions";
import { getGbxClient } from "@/lib/gbx-service";
import { getLogger } from "@/lib/logger";
import { getKeyJukebox, getRedisClient } from "@/lib/redis";
import { JukeboxMap } from "@/types/map";
import { ServerError, ServerResponse } from "@/types/responses";
import "server-only";

export async function getJukebox(
  serverId: string,
): Promise<ServerResponse<JukeboxMap[]>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const redis = await getRedisClient();
      const key = getKeyJukebox(serverId);
      const items = await redis.lrange(key, 0, -1);
      return items.map((item) => JSON.parse(item));
    },
  );
}

export async function getCurrentMapIndex(
  serverId: string,
): Promise<ServerResponse<number>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:member`,
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:member`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const meta = {
        type: "gbx",
        module: "game",
        function: "getCurrentMapIndex",
      };
      const log = getLogger(serverId);
      const client = getGbxClient(serverId);
      const mapIndex = await client.call("GetCurrentMapIndex");

      if (typeof mapIndex !== "number") {
        log.error({ meta, mapIndex }, "Failed to get current map index");
        throw new ServerError(
          "Failed to get current map index",
          "GetCurrentMapIndexError",
        );
      }

      return mapIndex;
    },
  );
}
