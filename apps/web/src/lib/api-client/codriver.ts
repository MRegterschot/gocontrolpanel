import type * as Codriver from "@/services/codriver";
import { apiGet } from "./http";

const server = (serverId: string) =>
  `/api/servers/${encodeURIComponent(serverId)}`;

export const getCodriverPanelOverview = (
  signal?: AbortSignal,
): ReturnType<typeof Codriver.getCodriverPanelOverview> =>
  apiGet("/api/codriver", undefined, { signal });

export const checkCodriverAccess = (
  serverId: string,
  login: string,
  signal?: AbortSignal,
): ReturnType<typeof Codriver.checkCodriverAccess> =>
  apiGet("/api/codriver/access", { serverId, login }, { signal });

export const getCodriverServerOverview = (
  serverId: string,
  signal?: AbortSignal,
): ReturnType<typeof Codriver.getCodriverServerOverview> =>
  apiGet(`${server(serverId)}/codriver`, undefined, { signal });

// Endpoint for usePaginationAPI
export const codriverRequestsPath = (serverId?: string) =>
  serverId ? `${server(serverId)}/codriver/requests` : "/api/codriver/requests";

export const getCodriverChatAccess = (
  serverId: string,
  signal?: AbortSignal,
): ReturnType<typeof Codriver.getCodriverChatAccess> =>
  apiGet(`${server(serverId)}/codriver/chat`, undefined, { signal });

export const getCodriverUsage = (
  serverId?: string,
  signal?: AbortSignal,
): ReturnType<typeof import("@/services/codriver-usage").getCodriverUsage> =>
  apiGet(
    serverId ? `${server(serverId)}/codriver/usage` : "/api/codriver/usage",
    undefined,
    { signal },
  );
