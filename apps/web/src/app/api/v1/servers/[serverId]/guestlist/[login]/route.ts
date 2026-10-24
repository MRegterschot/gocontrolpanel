import { addGuestAs, removeGuestAs } from "@/actions/gbx/server-only/player";
import { publicApiRoute } from "@/lib/public-api/route";
import { addToGuestlist, removeFromGuestlist } from "@gcp/shared/public-api";

export const PUT = publicApiRoute(addToGuestlist, async ({ actor, params }) => {
  await addGuestAs(actor, params.serverId, params.login);
});

export const DELETE = publicApiRoute(
  removeFromGuestlist,
  async ({ actor, params }) => {
    await removeGuestAs(actor, params.serverId, params.login);
  },
);
