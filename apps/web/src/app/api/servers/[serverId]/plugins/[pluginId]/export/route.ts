import { apiRoute } from "@/lib/api-route";
import { exportServerPluginConfig } from "@/services/database/server-plugins";

export const GET = apiRoute<{ serverId: string; pluginId: string }>(
  async ({ params }) => {
    return exportServerPluginConfig(params.serverId, params.pluginId);
  },
);
