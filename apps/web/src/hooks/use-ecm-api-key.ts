"use client";

import { getEcmApiKey } from "@/lib/api-client/database";
import { queryKeys, unwrap } from "@/lib/api-client/query";
import { useQuery } from "@tanstack/react-query";

export const useEcmApiKey = (serverId: string) =>
  useQuery({
    queryKey: queryKeys.ecmApiKey(serverId),
    queryFn: ({ signal }) =>
      unwrap(getEcmApiKey(serverId, signal), "GetEcmApiKeyError"),
    enabled: !!serverId,
    // The plugin can update its key in-game; read it again whenever the dialog opens.
    staleTime: 0,
    gcTime: 0,
  });
