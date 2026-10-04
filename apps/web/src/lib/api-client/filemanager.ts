import type * as Filemanager from "@/services/filemanager";
import { apiGet } from "./http";

export const getScripts = (
  serverId: string,
): ReturnType<typeof Filemanager.getScripts> =>
  apiGet(`/api/servers/${encodeURIComponent(serverId)}/scripts`);
