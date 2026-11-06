import { apiRoute } from "@/lib/api-route";
import { getJukebox } from "@/services/gbx/map";

export const GET = apiRoute<{ serverId: string }>(async ({ params }) => {
  return getJukebox(params.serverId);
});
