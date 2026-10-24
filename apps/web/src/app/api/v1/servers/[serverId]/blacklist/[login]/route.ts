import {
  blacklistPlayerAs,
  unblacklistPlayerAs,
} from "@/actions/gbx/server-only/player";
import { publicApiRoute } from "@/lib/public-api/route";
import { addToBlacklist, removeFromBlacklist } from "@gcp/shared/public-api";

export const PUT = publicApiRoute(addToBlacklist, async ({ actor, params }) => {
  await blacklistPlayerAs(actor, params.serverId, params.login);
});

export const DELETE = publicApiRoute(
  removeFromBlacklist,
  async ({ actor, params }) => {
    await unblacklistPlayerAs(actor, params.serverId, params.login);
  },
);
