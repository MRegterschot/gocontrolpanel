import {
  getApiToken,
  getHetznerServers,
  setRateLimit,
} from "@/actions/hetzner/util";
import { doServerActionWithAuth } from "@/lib/actions";
import { axiosHetzner } from "@/lib/axios/hetzner";
import {
  getKeyHetznerRateLimit,
  getKeyHetznerRecentlyCreatedServers,
  getRedisClient,
} from "@/lib/redis";
import {
  HetznerServer,
  HetznerServerCache,
  HetznerServerMetrics,
  HetznerServerMetricsResponse,
  HetznerServersResponse,
} from "@/types/api/hetzner/servers";
import {
  PaginationResponse,
  ServerError,
  ServerResponse,
} from "@/types/responses";
import { PaginationState } from "@tanstack/react-table";
import "server-only";

export async function getHetznerServersPaginated(
  pagination: PaginationState,
  sorting: { field: string; order: "asc" | "desc" },
  filter?: string,
  fetchArgs?: { projectId: string },
): Promise<ServerResponse<PaginationResponse<HetznerServer>>> {
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
          "Project ID is required to fetch Hetzner servers.",
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

      const res = await axiosHetzner.get<HetznerServersResponse>("/servers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });

      await setRateLimit(projectId, res);

      return {
        data: res.data.servers,
        totalCount: res.data.meta.pagination.total_entries || 0,
      };
    },
  );
}

export async function getRateLimit(
  projectId: string,
): Promise<ServerResponse<{ limit: number; remaining: number }>> {
  return doServerActionWithAuth(
    [
      "hetzner:servers:view",
      `hetzner:${projectId}:moderator`,
      `hetzner:${projectId}:admin`,
    ],
    async () => {
      const client = await getRedisClient();
      const rateLimitData = await client.get(getKeyHetznerRateLimit(projectId));

      if (!rateLimitData) {
        await getHetznerServers(projectId);
        const newRateLimitData = await client.get(
          getKeyHetznerRateLimit(projectId),
        );
        if (!newRateLimitData) {
          throw new ServerError(
            "Rate limit data not found after fetching servers.",
            "RateLimitDataNotFound",
          );
        }

        const { limit, remaining } = JSON.parse(newRateLimitData);

        return {
          limit: Math.floor(parseFloat(limit)),
          remaining: Math.floor(parseFloat(remaining)),
        };
      }

      const { limit, remaining } = JSON.parse(rateLimitData);

      return {
        limit: Math.floor(parseFloat(limit)),
        remaining: Math.floor(parseFloat(remaining)),
      };
    },
  );
}

export async function getRecentlyCreatedHetznerServers(): Promise<
  ServerResponse<HetznerServerCache[]>
> {
  return doServerActionWithAuth(
    [`hetzner::moderator`, `hetzner::admin`],
    async (session) => {
      const projectIds = session.user.projects.map((p) => p.id);

      if (projectIds.length === 0) {
        return [];
      }

      const client = await getRedisClient();
      const keys = projectIds.map((id) =>
        getKeyHetznerRecentlyCreatedServers(id),
      );

      const results = await Promise.all(
        keys.map((key) => client.lrange(key, 0, -1)),
      );

      const servers: HetznerServerCache[] = results.flatMap((result) =>
        result.map((item) => JSON.parse(item)),
      );

      return servers;
    },
  );
}

export async function getAllDatabases(
  projectId: string,
): Promise<ServerResponse<HetznerServer[]>> {
  return doServerActionWithAuth(
    ["hetzner:servers:create", `hetzner:${projectId}:admin`],
    async () => {
      const token = await getApiToken(projectId);

      const servers: HetznerServer[] = [];
      let page = 1;
      let totalEntries = 0;

      do {
        const res = await axiosHetzner.get<HetznerServersResponse>("/servers", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            page,
            per_page: 50,
          },
        });

        servers.push(...res.data.servers);
        totalEntries = res.data.meta.pagination.total_entries || 0;
        page++;
      } while (servers.length < totalEntries);

      return servers.filter((server) => server.labels.type === "database");
    },
  );
}

export async function getHetznerServerMetrics(
  projectId: string,
  serverId: number,
  start: Date,
  end: Date = new Date(),
): Promise<ServerResponse<HetznerServerMetrics>> {
  return doServerActionWithAuth(
    [
      "hetzner:servers:view",
      `hetzner:${projectId}:moderator`,
      `hetzner:${projectId}:admin`,
    ],
    async () => {
      const token = await getApiToken(projectId);

      const res = await axiosHetzner.get<HetznerServerMetricsResponse>(
        `/servers/${serverId}/metrics`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            type: "cpu,disk,network",
            start: start.toISOString(),
            end: end.toISOString(),
          },
        },
      );

      return res.data.metrics;
    },
  );
}
