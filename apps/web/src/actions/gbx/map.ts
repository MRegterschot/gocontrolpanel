"use server";
import { assertResourceId } from "@/lib/resource-id";

import { doServerActionWithAuth } from "@/lib/actions";
import { actorFromSession } from "@/lib/actor";
import { gbxService } from "@/lib/gbx-service";
import { JukeboxMap } from "@/types/map";
import { ServerResponse } from "@/types/responses";
import { Maps } from "@gcp/db";
import {
  addMapAs,
  addMapsAs,
  addMapToJukeboxAs,
  auditMapListChange,
  clearJukeboxAs,
  jumpToMapIndexAs,
  removeFromJukeboxAs,
  removeMapsAs,
  reorderMapsAs,
  setJukeboxAs,
} from "./server-only/map";

export async function setJukebox(
  serverId: string,
  jukebox: JukeboxMap[],
): Promise<ServerResponse> {
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) => setJukeboxAs(actorFromSession(session), serverId, jukebox),
  );
}

export async function clearJukebox(serverId: string): Promise<ServerResponse> {
  assertResourceId(serverId);
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
  assertResourceId(serverId);
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
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) =>
      removeFromJukeboxAs(actorFromSession(session), serverId, mapId),
  );
}

export async function jumpToMap(
  serverId: string,
  index: number,
): Promise<ServerResponse> {
  assertResourceId(serverId);
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
  assertResourceId(serverId);
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
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) => addMapsAs(actorFromSession(session), serverId, filenames),
  );
}

export async function removeMap(
  serverId: string,
  filename: string,
): Promise<ServerResponse> {
  assertResourceId(serverId);
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
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) => removeMapsAs(actorFromSession(session), serverId, filenames),
  );
}

export async function reorderMapList(
  serverId: string,
  filenames: string[],
): Promise<ServerResponse> {
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) => reorderMapsAs(actorFromSession(session), serverId, filenames),
  );
}
