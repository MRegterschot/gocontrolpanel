import { getApiToken, setRateLimit } from "@/actions/hetzner/util";
import { doServerActionWithAuth } from "@/lib/actions";
import { axiosHetzner } from "@/lib/axios/hetzner";
import {
  HetznerNetwork,
  HetznerNetworksResponse,
} from "@/types/api/hetzner/networks";
import {
  PaginationResponse,
  ServerError,
  ServerResponse,
} from "@/types/responses";
import { PaginationState } from "@tanstack/react-table";
import "server-only";

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
        throw new ServerError(
          "Project ID is required to fetch Hetzner networks.",
          "ProjectIdMissing",
        );
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
