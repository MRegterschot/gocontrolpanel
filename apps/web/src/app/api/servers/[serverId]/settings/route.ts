import { apiRoute } from "@/lib/api-route";
import { getServerSettings } from "@/services/gbx/server";

export const GET = apiRoute<{ serverId: string }>(async ({ params }) => {
  return getServerSettings(params.serverId);
});
