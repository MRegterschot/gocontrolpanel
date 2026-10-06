import { apiRoute } from "@/lib/api-route";
import { getPluginManialinks } from "@/services/plugin-manialinks";

export const GET = apiRoute<{ serverId: string; pluginId: string }>(
  async ({ params }) => getPluginManialinks(params.serverId, params.pluginId),
);
