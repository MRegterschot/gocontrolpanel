import { removeFromJukeboxAs } from "@/actions/gbx/server-only/map";
import { notFound, publicApiRoute } from "@/lib/public-api/route";
import { getJukeboxAs } from "@/services/gbx/map";
import { removeFromJukebox } from "@gcp/shared/public-api";

export const DELETE = publicApiRoute(
  removeFromJukebox,
  async ({ actor, params }) => {
    const entries = await getJukeboxAs(actor, params.serverId);
    const entry = entries.find((e) => e.uid === params.uid);
    if (!entry) throw notFound("Map is not in the jukebox");
    await removeFromJukeboxAs(actor, params.serverId, entry.id);
  },
);
