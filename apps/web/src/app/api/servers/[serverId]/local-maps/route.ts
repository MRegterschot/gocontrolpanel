import { apiRoute } from "@/lib/api-route";
import { getLocalMaps } from "@/services/gbx/server";

export const GET = apiRoute<{ serverId: string }>(async ({ params }) => {
  return getLocalMaps(params.serverId);
});
