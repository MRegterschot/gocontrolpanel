import { apiRoute } from "@/lib/api-route";
import { getGuestlist } from "@/services/gbx/player";

export const GET = apiRoute<{ serverId: string }>(async ({ params }) => {
  return getGuestlist(params.serverId);
});
