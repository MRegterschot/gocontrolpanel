"use server";

import { AddHetznerNetworkSchemaType } from "@/forms/admin/hetzner/network/add-hetzner-network-schema";
import { AddSubnetToNetworkSchemaType } from "@/forms/admin/hetzner/network/add-subnet-to-network-schema";
import { RemoveSubnetFromNetworkSchemaType } from "@/forms/admin/hetzner/network/remove-subnet-from-network-schema";
import { doServerActionWithAuth } from "@/lib/actions";
import { axiosHetzner } from "@/lib/axios/hetzner";
import {
  HetznerNetwork,
  HetznerNetworksResponse,
} from "@/types/api/hetzner/networks";
import { PaginationResponse, ServerError, ServerResponse } from "@/types/responses";
import { PaginationState } from "@tanstack/react-table";
import { logAudit } from "../database/server-only/audit-logs";
import { getApiToken, setRateLimit } from "./util";

export async function getHetznerNetworksPaginated(
  pagination: PaginationState,
  sorting: { field: string; order: "asc" | "desc" },
  filter?: string,
  fetchArgs?: { projectId: string },
): Promise<ServerResponse<PaginationResponse<HetznerNetwork>>> {
  return doServerActionWithAuth(
    [
      "hetzner:servers:view",
      `hetzner:${fetchArgs?.projectId}:moderator`,
      `hetzner:${fetchArgs?.projectId}:admin`,
    ],
    async () => {
      const { projectId } = fetchArgs || {};
      if (!projectId) {
        throw new ServerError("Project ID is required to fetch Hetzner networks.", "ProjectIdMissing");
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

      const res = await axiosHetzner.get<HetznerNetworksResponse>("/networks", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });

      await setRateLimit(projectId, res);

      return {
        data: res.data.networks,
        totalCount: res.data.meta.pagination.total_entries || 0,
      };
    },
  );
}

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

export async function getAllNetworks(
  projectId: string,
): Promise<ServerResponse<HetznerNetwork[]>> {
  return doServerActionWithAuth(
    [
      "hetzner:servers:view",
      `hetzner:${projectId}:moderator`,
      `hetzner:${projectId}:admin`,
    ],
    async () => {
      const token = await getApiToken(projectId);

      const networks: HetznerNetwork[] = [];
      let page = 1;
      let totalEntries = 0;

      do {
        const res = await axiosHetzner.get<HetznerNetworksResponse>(
          "/networks",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              page,
              per_page: 50,
            },
          },
        );

        networks.push(...res.data.networks);
        totalEntries = res.data.meta.pagination.total_entries || 0;
        page++;
      } while (networks.length < totalEntries);

      return networks;
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
