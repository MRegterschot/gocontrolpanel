import type { PluginManialinkSnapshot } from "@gcp/shared";
import { apiGet } from "./http";

export const getPluginManialinks = (
  serverId: string,
  pluginId: string,
  signal?: AbortSignal,
) =>
  apiGet<PluginManialinkSnapshot>(
    `/api/servers/${encodeURIComponent(serverId)}/plugins/${encodeURIComponent(pluginId)}/manialinks`,
    undefined,
    { signal },
  );
