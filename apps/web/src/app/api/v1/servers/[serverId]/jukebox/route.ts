import {
  addMapToJukeboxAs,
  clearJukeboxAs,
} from "@/actions/gbx/server-only/map";
import { toApiJukeboxEntry } from "@/lib/public-api/dto";
import { mapListOf } from "@/lib/public-api/maps";
import { notFound, publicApiRoute } from "@/lib/public-api/route";
import { getJukeboxAs } from "@/services/gbx/map";
import { addToJukebox, clearJukebox, getJukebox } from "@gcp/shared/public-api";

export const GET = publicApiRoute(getJukebox, async ({ actor, params }) => {
  const entries = await getJukeboxAs(actor, params.serverId);
  return { data: entries.map(toApiJukeboxEntry) };
});

export const POST = publicApiRoute(
  addToJukebox,
  async ({ actor, params, body }) => {
    // Only maps on this server's map list can be queued, as in the panel and Codriver
    const maps = await mapListOf(actor, params.serverId);
    const map = maps.find((m) => m.uid === body.uid);
    if (!map) throw notFound("Map is not on this server's map list");

    const { path: _path, ...row } = map;
    const entry = await addMapToJukeboxAs(actor, params.serverId, row);
    return { data: toApiJukeboxEntry(entry) };
  },
);

export const DELETE = publicApiRoute(
  clearJukebox,
  async ({ actor, params }) => {
    await clearJukeboxAs(actor, params.serverId);
  },
);
