import { apiRoute } from "@/lib/api-route";
import { getBlacklist } from "@/services/gbx/player";

export const GET = apiRoute<{ serverId: string }>(async ({ params }) => {
  return getBlacklist(params.serverId);
});
