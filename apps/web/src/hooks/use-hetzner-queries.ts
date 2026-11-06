import {
  getAllDatabases,
  getAllNetworks,
  getHetznerLocations,
  getServerTypes,
  getSSHKeys,
} from "@/lib/api-client/hetzner";
import { queryKeys, unwrap } from "@/lib/api-client/query";
import { useQuery } from "@tanstack/react-query";

// Locations, server types and SSH keys rarely change, so the forms that open one after
// another share one answer instead of asking Hetzner each time
const STATIC_STALE_MS = 5 * 60 * 1000;

export const useHetznerLocations = (projectId: string) =>
  useQuery({
    queryKey: queryKeys.hetzner(projectId, "locations"),
    queryFn: () =>
      unwrap(getHetznerLocations(projectId), "GetHetznerLocationsError"),
    staleTime: STATIC_STALE_MS,
    enabled: !!projectId,
  });

export const useHetznerServerTypes = (projectId: string) =>
  useQuery({
    queryKey: queryKeys.hetzner(projectId, "server-types"),
    queryFn: () => unwrap(getServerTypes(projectId), "GetServerTypesError"),
    staleTime: STATIC_STALE_MS,
    enabled: !!projectId,
  });

export const useHetznerSshKeys = (projectId: string) =>
  useQuery({
    queryKey: queryKeys.hetzner(projectId, "ssh-keys"),
    queryFn: () => unwrap(getSSHKeys(projectId), "GetSSHKeysError"),
    staleTime: STATIC_STALE_MS,
    enabled: !!projectId,
  });

// Networks and databases change when the user adds or removes one, so these are always refetched
export const useHetznerNetworks = (projectId: string) =>
  useQuery({
    queryKey: queryKeys.hetzner(projectId, "networks"),
    queryFn: () => unwrap(getAllNetworks(projectId), "GetAllNetworksError"),
    gcTime: 0,
    enabled: !!projectId,
  });

export const useHetznerDatabases = (projectId: string) =>
  useQuery({
    queryKey: queryKeys.hetzner(projectId, "databases"),
    queryFn: () => unwrap(getAllDatabases(projectId), "GetAllDatabasesError"),
    gcTime: 0,
    enabled: !!projectId,
  });
