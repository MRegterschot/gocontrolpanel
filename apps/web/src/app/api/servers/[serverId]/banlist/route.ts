import { apiRoute } from "@/lib/api-route";
import { getBanList } from "@/services/gbx/player";

export const GET = apiRoute<{ serverId: string }>(async ({ params }) => {
  return getBanList(params.serverId);
});
