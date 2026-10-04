import { apiRoute } from "@/lib/api-route";
import { getServerPlugin } from "@/services/gbx/server-plugin";

export const GET = apiRoute<{ serverId: string }>(async ({ params }) => {
  return getServerPlugin(params.serverId);
});
