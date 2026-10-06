"use client";
import { getPluginManialinks } from "@/lib/api-client/plugin-manialinks";
import { queryKeys, unwrap } from "@/lib/api-client/query";
import { useQuery } from "@tanstack/react-query";

export const usePluginManialinks = (serverId: string, pluginId: string) =>
  useQuery({
    queryKey: queryKeys.pluginManialinks(serverId, pluginId),
    queryFn: ({ signal }) =>
      unwrap(
        getPluginManialinks(serverId, pluginId, signal),
        "PluginManialinksError",
      ),
    enabled: !!serverId && !!pluginId,
    // A fresh snapshot on open, and explicit refresh while editing; never replace a draft.
    staleTime: 0,
    gcTime: 0,
  });
