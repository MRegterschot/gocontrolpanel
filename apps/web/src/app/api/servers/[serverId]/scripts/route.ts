import { apiRoute } from "@/lib/api-route";
import { getScripts } from "@/services/filemanager";

export const GET = apiRoute<{ serverId: string }>(async ({ params }) => {
  return getScripts(params.serverId);
});
