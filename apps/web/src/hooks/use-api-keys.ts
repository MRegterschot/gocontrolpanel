"use client";

import { getGroupApiKeys, getServerApiKeys } from "@/lib/api-client/database";
import { queryKeys, unwrap } from "@/lib/api-client/query";
import { useQuery } from "@tanstack/react-query";

export const useServerApiKeys = (serverId: string) =>
  useQuery({
    queryKey: queryKeys.serverApiKeys(serverId),
    queryFn: ({ signal }) =>
      unwrap(getServerApiKeys(serverId, signal), "GetServerApiKeysError"),
    enabled: !!serverId,
  });

export const useGroupApiKeys = (groupId: string) =>
  useQuery({
    queryKey: queryKeys.groupApiKeys(groupId),
    queryFn: ({ signal }) =>
      unwrap(getGroupApiKeys(groupId, signal), "GetGroupApiKeysError"),
    enabled: !!groupId,
  });
