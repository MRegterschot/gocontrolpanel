"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { actorFromSession } from "@/lib/actor";
import { gbxService } from "@/lib/gbx-service";
import { getLogger } from "@/lib/logger";
import { getKeyJukebox, getRedisClient } from "@/lib/redis";
import { getErrorMessage } from "@/lib/utils";
import { JukeboxMap } from "@/types/map";
import { ServerResponse } from "@/types/responses";
import { Maps } from "@gcp/db";
import { logAudit } from "../database/server-only/audit-logs";
import {
  addMapAs,
  addMapToJukeboxAs,
  auditMapListChange,
  clearJukeboxAs,
  jumpToMapIndexAs,
} from "./server-only/map";

export async function setJukebox(
  serverId: string,
  jukebox: JukeboxMap[],
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const redis = await getRedisClient();
      const key = getKeyJukebox(serverId);
      await redis.del(key);
      if (jukebox.length > 0) {
        await redis.rpush(key, ...jukebox.map((map) => JSON.stringify(map)));
      }
      await logAudit(
        session.user.id,
        serverId,
        "server.maps.jukebox.set",
        JSON.parse(JSON.stringify(jukebox)),
      );
    },
  );
}

export async function clearJukebox(serverId: string): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) => clearJukeboxAs(actorFromSession(session), serverId),
  );
}

export async function addMapToJukebox(
  serverId: string,
  map: Maps,
): Promise<ServerResponse<JukeboxMap>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) => addMapToJukeboxAs(actorFromSession(session), serverId, map),
  );
}

export async function removeMapFromJukebox(
  serverId: string,
  mapId: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const redis = await getRedisClient();
      const key = getKeyJukebox(serverId);
      const items = await redis.lrange(key, 0, -1);

      const filtered = items.filter((item) => {
        const parsed = JSON.parse(item);
        return parsed.id !== mapId;
      });

      await redis.del(key);
      if (filtered.length > 0) {
        await redis.rpush(key, ...filtered);
      }

      await logAudit(
        session.user.id,
        serverId,
        "server.maps.jukebox.remove",
        mapId,
      );
    },
  );
}

export async function jumpToMap(
  serverId: string,
  index: number,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) => jumpToMapIndexAs(actorFromSession(session), serverId, index),
  );
}

export async function addMap(
  serverId: string,
  filename: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) => addMapAs(actorFromSession(session), serverId, filename),
  );
}

export async function addMapList(
  serverId: string,
  filenames: string[],
): Promise<ServerResponse<number>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const meta = {
        type: "gbx",
        module: "game",
        function: "addMapList",
      };
      const log = getLogger(serverId);

      try {
        const { count } = await gbxService.addMaps(serverId, filenames);
        await logAudit(session.user.id, serverId, "server.maps.maplist.add", {
          filenames,
          addedCount: count,
        });
        return count;
      } catch (error) {
        await logAudit(
          session.user.id,
          serverId,
          "server.maps.maplist.add",
          { filenames, addedCount: 0 },
          getErrorMessage(error),
        );
        log.error({ meta, error, filenames }, "Failed to add map list");
        throw error;
      }
    },
  );
}

export async function removeMap(
  serverId: string,
  filename: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      await auditMapListChange(
        session.user.id,
        serverId,
        "server.maps.maplist.remove",
        filename,
        () => gbxService.removeMaps(serverId, [filename]),
      );
    },
  );
}

export async function removeMapList(
  serverId: string,
  filenames: string[],
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      await auditMapListChange(
        session.user.id,
        serverId,
        "server.maps.maplist.remove",
        filenames,
        () => gbxService.removeMaps(serverId, filenames),
      );
    },
  );
}

export async function reorderMapList(
  serverId: string,
  filenames: string[],
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const meta = {
        type: "gbx",
        module: "game",
        function: "reorderMapList",
      };
      const log = getLogger(serverId);

      try {
        await auditMapListChange(
          session.user.id,
          serverId,
          "server.maps.maplist.reorder",
          filenames,
          () => gbxService.reorderMaps(serverId, filenames),
        );
      } catch (error) {
        log.error({ meta, error, filenames }, "Failed to reorder map list");
        throw error;
      }
    },
  );
}
