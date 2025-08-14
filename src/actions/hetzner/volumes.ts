"use server";

import { AddHetznerVolumeSchemaType } from "@/forms/admin/hetzner/volume/add-hetzner-volume-schema";
import { doServerActionWithAuth } from "@/lib/actions";
import { axiosHetzner } from "@/lib/axios/hetzner";
import { Handlebars } from "@/lib/handlebars";
import { decryptHetznerToken } from "@/lib/hetzner";
import { connectToSSHServer, executeSSHCommand } from "@/lib/ssh";
import {
  HetznerVolume,
  HetznerVolumesResponse,
} from "@/types/api/hetzner/volumes";
import { PaginationResponse, ServerResponse } from "@/types/responses";
import { PaginationState } from "@tanstack/react-table";
import { readFileSync } from "fs";
import path from "path";
import { packageDirectorySync } from "pkg-dir";
import { getDBHetznerServer } from "../database/hetzner-servers";
import { getHetznerServerById } from "./servers";
import {
  getApiToken,
  getHetznerVolume,
  setRateLimit,
  updateHetznerVolume,
} from "./util";

const root = packageDirectorySync() || process.cwd();

// Mounting template
const mountTemplatePath = path.join(root, "hetzner", "volume-mount.sh.hbs");
const mountTemplateContent = readFileSync(mountTemplatePath, "utf-8");
const mountTemplate = Handlebars.compile(mountTemplateContent);

export async function getHetznerVolumesPaginated(
  pagination: PaginationState,
  sorting: { field: string; order: "asc" | "desc" },
  filter?: string,
  fetchArgs?: { projectId: string },
): Promise<ServerResponse<PaginationResponse<HetznerVolume>>> {
  return doServerActionWithAuth(
    [
      "hetzner:servers:view",
      `hetzner:${fetchArgs?.projectId}:moderator`,
      `hetzner:${fetchArgs?.projectId}:admin`,
    ],
    async () => {
      const { projectId } = fetchArgs || {};
      if (!projectId) {
        throw new Error("Project ID is required to fetch Hetzner volumes.");
      }

      const token = await getApiToken(projectId);

      const params = new URLSearchParams({
        page: pagination.pageIndex.toString(),
        per_page: pagination.pageSize.toString(),
        sort: `${sorting.field}:${sorting.order.toLowerCase()}`,
      });

      if (filter) {
        params.append("name", filter);
      }

      const res = await axiosHetzner.get<HetznerVolumesResponse>("/volumes", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });

      await setRateLimit(projectId, res);

      return {
        data: res.data.volumes,
        totalCount: res.data.meta.pagination.total_entries || 0,
      };
    },
  );
}

export async function getAllVolumes(
  projectId: string,
): Promise<ServerResponse<HetznerVolume[]>> {
  return doServerActionWithAuth(
    [
      "hetzner:servers:view",
      "hetzner:servers:create",
      `hetzner:${projectId}:moderator`,
      `hetzner:${projectId}:admin`,
    ],
    async () => {
      const token = await getApiToken(projectId);

      const volumes: HetznerVolume[] = [];
      let page = 1;
      let totalEntries = 0;

      do {
        const res = await axiosHetzner.get<HetznerVolumesResponse>("/volumes", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            page,
            per_page: 50,
          },
        });

        volumes.push(...res.data.volumes);
        totalEntries = res.data.meta.pagination.total_entries || 0;
        page++;
      } while (volumes.length < totalEntries);

      return volumes;
    },
  );
}

export async function deleteHetznerVolume(
  projectId: string,
  volumeId: number,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    ["hetzner:servers:delete", `hetzner:${projectId}:admin`],
    async () => {
      const token = await getApiToken(projectId);

      const res = await axiosHetzner.delete(`/volumes/${volumeId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await setRateLimit(projectId, res);
    },
  );
}

export async function createHetznerVolume(
  projectId: string,
  data: AddHetznerVolumeSchemaType,
): Promise<ServerResponse<HetznerVolume>> {
  return doServerActionWithAuth(
    ["hetzner:servers:create", `hetzner:${projectId}:admin`],
    async () => {
      const token = await getApiToken(projectId);

      const body = {
        size: data.size,
        name: data.name,
        format: "ext4",
        location: data.location,
      };

      const res = await axiosHetzner.post<{
        volume: HetznerVolume;
      }>("/volumes", body, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await setRateLimit(projectId, res);

      return res.data.volume;
    },
  );
}

export async function attachVolumeToServer(
  projectId: string,
  volumeId: number,
  serverId: number,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    ["hetzner:servers:create", `hetzner:${projectId}:admin`],
    async () => {
      const token = await getApiToken(projectId);

      const { data: server, error } = await getHetznerServerById(
        projectId,
        serverId,
      );

      if (error) {
        throw new Error(error);
      }

      if (!server.public_net.ipv4) {
        throw new Error("Server does not have a public network IP.");
      }

      const dbType = server.labels["database.type"];
      if (!dbType) {
        throw new Error("Server does not have a database type label.");
      }

      const dbServer = await getDBHetznerServer(serverId);
      if (!dbServer || !dbServer.privateKey) {
        throw new Error(
          "Could not find server or private key in the database.",
        );
      }

      const volume = await getHetznerVolume(projectId, volumeId);

      if (!volume) {
        throw new Error("Volume not found.");
      }

      if (
        volume.labels["database.type"] &&
        volume.labels["database.type"] !== dbType
      ) {
        throw new Error(
          `Volume is labeled with a different database type: ${volume.labels["database.type"]}`,
        );
      }

      const res = await axiosHetzner.post(
        `/volumes/${volumeId}/actions/attach`,
        { server: serverId, automount: false },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const conn = await connectToSSHServer(
        server.public_net.ipv4?.ip,
        22,
        "root",
        decryptHetznerToken(
          Buffer.from(dbServer.privateKey).toString("base64"),
        ),
      );

      const volumePath = `/dev/disk/by-id/scsi-0HC_Volume_${volumeId}`;
      const mountPath = `/var/lib/dbdata/${dbType}`;

      const mountData = {
        fuck_this_scuffed_shit: "{{.Image}} {{.Names}}",
        db_image: dbType,
        mount_path: mountPath,
        volume_path: volumePath,
      };

      const mountScript = mountTemplate(mountData);

      try {
        // Create mount directory if it doesn't exist
        const output = await executeSSHCommand(
          conn,
          `bash -s <<'END_SCRIPT'\n${mountScript}\nEND_SCRIPT`,
        );

        console.log("Mount script output:", output);
      } catch (err) {
        await detachVolumeFromServer(projectId, volumeId);
        throw new Error("Mounting failed")
      } finally {
        conn.end();
      }

      if (!volume.labels["database.type"]) {
        await updateHetznerVolume(projectId, volumeId, {
          labels: { "database.type": dbType },
        });
      }

      await setRateLimit(projectId, res);
    },
  );
}

export async function detachVolumeFromServer(
  projectId: string,
  volumeId: number,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    ["hetzner:servers:create", `hetzner:${projectId}:admin`],
    async () => {
      const token = await getApiToken(projectId);

      const res = await axiosHetzner.post(
        `/volumes/${volumeId}/actions/detach`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      await setRateLimit(projectId, res);
    },
  );
}
