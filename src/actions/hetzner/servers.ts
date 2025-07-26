"use server";

import { AddHetznerServerSchemaType } from "@/forms/admin/hetzner/add-hetzner-server-schema";
import { doServerActionWithAuth } from "@/lib/actions";
import { axiosHetzner } from "@/lib/axios/hetzner";
import {
  getKeyHetznerRateLimit,
  getKeyHetznerRecentlyCreatedServers,
  getRedisClient,
} from "@/lib/redis";
import { generateRandomString } from "@/lib/utils";
import {
  HetznerServer,
  HetznerServerCache,
  HetznerServersResponse,
} from "@/types/api/hetzner/servers";
import { PaginationResponse, ServerResponse } from "@/types/responses";
import { PaginationState } from "@tanstack/react-table";
import { readFileSync } from "fs";
import Handlebars from "handlebars";
import path from "path";
import { packageDirectorySync } from "pkg-dir";
import { getApiToken, getHetznerServers, setRateLimit } from "./util";

const root = packageDirectorySync() || process.cwd();
const templatePath = path.join(root, "hetzner", "server-init.sh.hbs");
const templateContent = readFileSync(templatePath, "utf-8");
const template = Handlebars.compile(templateContent);

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
        throw new Error("Project ID is required to fetch Hetzner servers.");
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

export async function deleteHetznerServer(
  projectId: string,
  serverId: number,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    ["hetzner:servers:delete", `hetzner:${projectId}:admin`],
    async () => {
      const token = await getApiToken(projectId);

      const res = await axiosHetzner.delete(`/servers/${serverId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const client = await getRedisClient();
      const key = getKeyHetznerRecentlyCreatedServers(projectId);

      const servers = await client.lrange(key, 0, -1);

      const updatedServers = servers
        .map((item) => JSON.parse(item))
        .filter((server: HetznerServerCache) => server.id !== serverId);

      await client.del(key);
      if (updatedServers.length > 0) {
        await client.rpush(
          key,
          ...updatedServers.map((s) => JSON.stringify(s)),
        );
        await client.expire(key, 60 * 60 * 2); // Keep for 2 hours
      }

      await setRateLimit(projectId, res);
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
          throw new Error("Rate limit data not found after fetching servers.");
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

export async function createHetznerServer(
  projectId: string,
  data: AddHetznerServerSchemaType,
): Promise<ServerResponse<HetznerServer>> {
  return doServerActionWithAuth(
    ["hetzner:servers:create", `hetzner:${projectId}:admin`],
    async () => {
      const token = await getApiToken(projectId);

      const dediData = {
        dedi_login: data.dediLogin,
        dedi_password: data.dediPassword,
        room_password: data.roomPassword,
        superadmin_password:
          data.superAdminPassword || generateRandomString(16),
        admin_password: data.adminPassword || generateRandomString(16),
        user_password: data.userPassword || generateRandomString(16),
        filemanager_password:
          data.filemanagerPassword || generateRandomString(16),
      };

      const userData = template(dediData);

      const body = {
        name: data.name,
        server_type: parseInt(data.serverType),
        image: parseInt(data.image),
        location: data.location,
        user_data: userData,
        labels: {
          "authorization.superadmin.password": dediData.superadmin_password,
          "authorization.admin.password": dediData.admin_password,
          "authorization.user.password": dediData.user_password,
          "filemanager.password": dediData.filemanager_password,
        },
        public_net: {
          enable_ipv4: true,
          enable_ipv6: false,
        },
      };

      const res = await axiosHetzner.post<{
        server: HetznerServer;
      }>("/servers", body, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const cachedServer: HetznerServerCache = {
        id: res.data.server.id,
        projectId,
        name: res.data.server.name,
        ip: res.data.server.public_net.ipv4?.ip,
        labels: res.data.server.labels,
      };

      const client = await getRedisClient();
      const key = getKeyHetznerRecentlyCreatedServers(projectId);
      await client.lpush(key, JSON.stringify(cachedServer));
      await client.expire(key, 60 * 60 * 2); // Keep for 2 hours

      await setRateLimit(projectId, res);

      return res.data.server;
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
