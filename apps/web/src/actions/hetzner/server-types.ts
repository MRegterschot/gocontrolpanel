"use server";
import { doServerActionWithAuth } from "@/lib/actions";
import { axiosHetzner } from "@/lib/axios/hetzner";
import { getKeyHetznerServerTypes, getRedisClient } from "@/lib/redis";
import {
  HetznerServerType,
  HetznerServerTypesResponse,
} from "@/types/api/hetzner/servers";
import { ServerResponse } from "@/types/responses";
import { getApiToken } from "./util";

export async function getServerTypes(
  projectId: string,
): Promise<ServerResponse<HetznerServerType[]>> {
  return doServerActionWithAuth(
    [
      "hetzner:servers:view",
      "hetzner:servers:create",
      `hetzner:${projectId}:moderator`,
      `hetzner:${projectId}:admin`,
    ],
    async () => {
      const redis = await getRedisClient();
      const key = getKeyHetznerServerTypes();

      const cachedData = await redis.get(key);
      if (cachedData) {
        return JSON.parse(cachedData) as HetznerServerType[];
      }

      const token = await getApiToken(projectId);
      const res = await axiosHetzner.get<HetznerServerTypesResponse>(
        "/server_types",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const serverTypes = res.data.server_types;
      await redis.set(key, JSON.stringify(serverTypes), "EX", 60 * 60 * 24); // Cache for 24 hours

      return serverTypes;
    },
  );
}
