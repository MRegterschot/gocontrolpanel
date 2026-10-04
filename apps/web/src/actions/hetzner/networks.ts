"use server";

import { AddHetznerNetworkSchemaType } from "@/forms/admin/hetzner/network/add-hetzner-network-schema";
import { AddSubnetToNetworkSchemaType } from "@/forms/admin/hetzner/network/add-subnet-to-network-schema";
import { RemoveSubnetFromNetworkSchemaType } from "@/forms/admin/hetzner/network/remove-subnet-from-network-schema";
import { doServerActionWithAuth } from "@/lib/actions";
import { axiosHetzner } from "@/lib/axios/hetzner";
import { HetznerNetwork } from "@/types/api/hetzner/networks";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";
import { getApiToken, setRateLimit } from "./util";

export async function deleteHetznerNetwork(
  projectId: string,
  networkId: number,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    ["hetzner:servers:delete", `hetzner:${projectId}:admin`],
    async (session) => {
      const token = await getApiToken(projectId);

      const res = await axiosHetzner.delete(`/networks/${networkId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await logAudit(
        session.user.id,
        projectId,
        "hetzner.network.delete",
        networkId,
      );

      await setRateLimit(projectId, res);
    },
  );
}

export async function createHetznerNetwork(
  projectId: string,
  data: AddHetznerNetworkSchemaType,
): Promise<ServerResponse<HetznerNetwork>> {
  return doServerActionWithAuth(
    ["hetzner:servers:create", `hetzner:${projectId}:admin`],
    async (session) => {
      const token = await getApiToken(projectId);

      const body = {
        name: data.name,
        ip_range: data.ipRange,
        subnets: data.subnets.map((subnet) => ({
          type: subnet.type,
          ip_range: subnet.ipRange || undefined,
          network_zone: subnet.networkZone,
        })),
      };

      const res = await axiosHetzner.post<{
        network: HetznerNetwork;
      }>("/networks", body, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await logAudit(session.user.id, projectId, "hetzner.network.create", {
        id: res.data.network.id,
        data,
      });

      await setRateLimit(projectId, res);

      return res.data.network;
    },
  );
}

export async function addSubnetToNetwork(
  projectId: string,
  networkId: number,
  data: AddSubnetToNetworkSchemaType,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    ["hetzner:servers:create", `hetzner:${projectId}:admin`],
    async (session) => {
      const token = await getApiToken(projectId);

      const body = {
        type: data.type,
        ip_range: data.ipRange || undefined,
        network_zone: data.networkZone,
      };

      const res = await axiosHetzner.post(
        `/networks/${networkId}/actions/add_subnet`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      await logAudit(session.user.id, projectId, "hetzner.network.subnet.add", {
        networkId,
        data,
      });

      await setRateLimit(projectId, res);
    },
  );
}

export async function removeSubnetFromNetwork(
  projectId: string,
  networkId: number,
  data: RemoveSubnetFromNetworkSchemaType,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    ["hetzner:servers:create", `hetzner:${projectId}:admin`],
    async (session) => {
      const token = await getApiToken(projectId);

      const res = await axiosHetzner.post(
        `/networks/${networkId}/actions/delete_subnet`,
        { ip_range: data.ipRange },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      await logAudit(
        session.user.id,
        projectId,
        "hetzner.network.subnet.remove",
        { networkId, data },
      );

      await setRateLimit(projectId, res);
    },
  );
}
