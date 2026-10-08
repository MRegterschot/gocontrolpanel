import { restartMapAs } from "@/actions/gbx/server-only/game";
import {
  clearJukeboxAs,
  jumpToMapIndexAs,
  removeMapsAs,
} from "@/actions/gbx/server-only/map";
import { getGbxClient } from "@/lib/gbx-service";
import { getErrorMessage } from "@/lib/utils";
import "server-only";
import { CodriverError, type ToolContext } from "../types";

// Helpers around the dedicated server's map list, shared by the map tools

export interface ServerMap {
  UId: string;
  Name: string;
  FileName: string;
  Author: string;
}

export async function serverMaps(serverId: string): Promise<ServerMap[]> {
  const maps = await getGbxClient(serverId).call<ServerMap[]>(
    "GetMapList",
    5000,
    0,
  );
  return Array.isArray(maps) ? maps : [];
}

// The server refuses to jump to the map that is already playing; restarting is what was meant
export async function jumpOrRestart(
  ctx: ToolContext,
  index: number,
): Promise<"jumped" | "restarted"> {
  try {
    await jumpToMapIndexAs(ctx.actor, ctx.serverId, index);
    return "jumped";
  } catch (error) {
    if (!/must be different/i.test(getErrorMessage(error))) throw error;
    await restartMapAs(ctx.actor, ctx.serverId);
    return "restarted";
  }
}

// Makes the given maps the whole map list and switches to the first of them. Maps are
// matched by UID because the server may already hold one under another file name.
export async function playOnly(
  ctx: ToolContext,
  uids: string[],
): Promise<{ count: number; restarted: boolean }> {
  const listed = await serverMaps(ctx.serverId);
  const keep = listed.filter((map) => uids.includes(map.UId));
  if (keep.length === 0)
    throw new CodriverError("I couldn't find the new maps in the map list.");
  const drop = listed.filter((map) => !keep.includes(map));
  if (drop.length > 0)
    await removeMapsAs(
      ctx.actor,
      ctx.serverId,
      drop.map((map) => map.FileName),
    );
  await clearJukeboxAs(ctx.actor, ctx.serverId);

  const now = await serverMaps(ctx.serverId);
  const firstUid = uids.find((uid) => now.some((map) => map.UId === uid));
  const first = now.findIndex((map) => map.UId === firstUid);
  const restarted =
    (await jumpOrRestart(ctx, Math.max(first, 0))) === "restarted";
  return { count: keep.length, restarted };
}
