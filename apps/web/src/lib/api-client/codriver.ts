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
export const codriverRequestsPath = (serverId: string) =>
  `${server(serverId)}/codriver/requests`;
