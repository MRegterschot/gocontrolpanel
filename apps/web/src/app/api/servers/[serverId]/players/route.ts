import { apiRoute } from "@/lib/api-route";
import { getPlayerList } from "@/services/gbx/player";

export const GET = apiRoute<{ serverId: string }>(async ({ params }) => {
  return getPlayerList(params.serverId);
});
