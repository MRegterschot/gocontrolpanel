"use client";

import {
  checkCodriverAccess,
  getCodriverPanelOverview,
  getCodriverServerOverview,
} from "@/lib/api-client/codriver";
import { queryKeys, unwrap } from "@/lib/api-client/query";
import { useQuery } from "@tanstack/react-query";

export const useCodriverPanelOverview = () =>
  useQuery({
    queryKey: queryKeys.codriverPanel,
    queryFn: ({ signal }) =>
      unwrap(getCodriverPanelOverview(signal), "GetCodriverPanelError"),
  });

export const useCodriverServerOverview = (serverId: string) =>
  useQuery({
    queryKey: queryKeys.codriverServer(serverId),
    queryFn: ({ signal }) =>
      unwrap(
        getCodriverServerOverview(serverId, signal),
        "GetCodriverServerError",
      ),
    enabled: !!serverId,
  });

// Runs only when both are chosen; the answer changes with every rule edit, so never cached long
export const useCodriverAccessCheck = (serverId: string, login: string) =>
  useQuery({
    queryKey: queryKeys.codriverAccess(serverId, login),
    queryFn: ({ signal }) =>
      unwrap(
        checkCodriverAccess(serverId, login, signal),
        "CheckCodriverAccessError",
      ),
    enabled: !!serverId && !!login,
    staleTime: 0,
  });
