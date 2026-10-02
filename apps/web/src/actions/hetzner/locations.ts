"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { axiosHetzner } from "@/lib/axios/hetzner";
import { getKeyHetznerLocations, getRedisClient } from "@/lib/redis";
import {
  HetznerLocation,
  HetznerLocationsResponse,
} from "@/types/api/hetzner/locations";
import { ServerResponse } from "@/types/responses";
import { getApiToken } from "./util";

export async function getHetznerLocations(
  projectId: string,
): Promise<ServerResponse<HetznerLocation[]>> {
  return doServerActionWithAuth(
    [
      "hetzner:servers:view",
      "hetzner:servers:create",
      `hetzner:${projectId}:moderator`,
      `hetzner:${projectId}:admin`,
    ],
    async () => {
      const redis = await getRedisClient();
      const key = getKeyHetznerLocations();

      const cachedData = await redis.get(key);
      if (cachedData) {
        return JSON.parse(cachedData) as HetznerLocation[];
      }

      const token = await getApiToken(projectId);
      const res = await axiosHetzner.get<HetznerLocationsResponse>(
        "/locations",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const locations = res.data.locations;
      await redis.set(key, JSON.stringify(locations), "EX", 60 * 60 * 24); // Cache for 24 hours

      return locations;
    },
  );
}
