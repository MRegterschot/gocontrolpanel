import { setJukeboxAs } from "@/actions/gbx/server-only/map";
import { inUidOrder } from "@/lib/public-api/maps";
import { publicApiRoute } from "@/lib/public-api/route";
import { getJukeboxAs } from "@/services/gbx/map";
import { reorderJukebox } from "@tmcontrolpanel/shared/public-api";

export const PUT = publicApiRoute(
  reorderJukebox,
  async ({ actor, params, body }) => {
    const entries = await getJukeboxAs(actor, params.serverId);
    const ordered = inUidOrder(entries, body.uids, (entry) => entry.uid);
    await setJukeboxAs(actor, params.serverId, ordered);
  },
);
