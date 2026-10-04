"use server";

import { AddHetznerVolumeSchemaType } from "@/forms/admin/hetzner/volume/add-hetzner-volume-schema";
import { doServerActionWithAuth } from "@/lib/actions";
import { axiosHetzner } from "@/lib/axios/hetzner";
import { HetznerVolume } from "@/types/api/hetzner/volumes";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";
import { getApiToken, setRateLimit } from "./util";

export async function deleteHetznerVolume(
  projectId: string,
  volumeId: number,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    ["hetzner:servers:delete", `hetzner:${projectId}:admin`],
    async (session) => {
      const token = await getApiToken(projectId);

      const res = await axiosHetzner.delete(`/volumes/${volumeId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await logAudit(
        session.user.id,
        projectId,
        "hetzner.volume.delete",
        volumeId,
      );

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
    async (session) => {
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

      await logAudit(session.user.id, projectId, "hetzner.volume.create", {
        id: res.data.volume.id,
        data,
      });

      await setRateLimit(projectId, res);

      return res.data.volume;
    },
  );
}
