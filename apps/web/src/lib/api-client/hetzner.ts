import type * as Locations from "@/services/hetzner/locations";
import type * as Networks from "@/services/hetzner/networks";
import type * as ServerActions from "@/services/hetzner/server-actions";
import type * as ServerTypes from "@/services/hetzner/server-types";
import type * as Servers from "@/services/hetzner/servers";
import type * as SshKeys from "@/services/hetzner/ssh-keys";
import { apiGet } from "./http";

const project = (projectId: string) =>
  `/api/hetzner/${encodeURIComponent(projectId)}`;

export const getHetznerLocations = (
  projectId: string,
): ReturnType<typeof Locations.getHetznerLocations> =>
  apiGet(`${project(projectId)}/locations`);

export const getSSHKeys = (
  projectId: string,
): ReturnType<typeof SshKeys.getSSHKeys> =>
  apiGet(`${project(projectId)}/ssh-keys`);

export const getServerTypes = (
  projectId: string,
): ReturnType<typeof ServerTypes.getServerTypes> =>
  apiGet(`${project(projectId)}/server-types`);

export const getAllDatabases = (
  projectId: string,
): ReturnType<typeof Servers.getAllDatabases> =>
  apiGet(`${project(projectId)}/databases`);

export const getAllNetworks = (
  projectId: string,
): ReturnType<typeof Networks.getAllNetworks> =>
  apiGet(`${project(projectId)}/networks/all`);

export const getLogs = (
  projectId: string,
  serverId: number,
  tmServerNumber: number,
  command: "dedicated" | "filemanager" | "servercontroller" = "dedicated",
): ReturnType<typeof ServerActions.getLogs> =>
  apiGet(`${project(projectId)}/servers/${serverId}/logs`, {
    number: tmServerNumber,
    command,
  });

export const getHetznerServerMetrics = (
  projectId: string,
  serverId: number,
  start: Date,
  end: Date = new Date(),
): ReturnType<typeof Servers.getHetznerServerMetrics> =>
  apiGet(`${project(projectId)}/servers/${serverId}/metrics`, {
    start: start.toISOString(),
    end: end.toISOString(),
  });
