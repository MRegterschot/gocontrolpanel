"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { axiosHetzner } from "@/lib/axios/hetzner";
import { getKeyHetznerImages, getRedisClient } from "@/lib/redis";
import {
  HetznerImage,
  HetznerImagesResponse,
} from "@/types/api/hetzner/servers";
import { ServerResponse } from "@/types/responses";
import { getApiToken } from "./util";

export async function getHetznerImages(
  projectId: string,
): Promise<ServerResponse<HetznerImage[]>> {
  return doServerActionWithAuth(
    ["hetzner:servers:create", `hetzner:${projectId}:admin`],
    async () => {
      const redis = await getRedisClient();
      const key = getKeyHetznerImages();

      const cachedData = await redis.get(key);
      if (cachedData) {
        return JSON.parse(cachedData) as HetznerImage[];
      }

      const token = await getApiToken(projectId);
      const res = await axiosHetzner.get<HetznerImagesResponse>("/images", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const images = res.data.images;
      await redis.set(key, JSON.stringify(images), "EX", 60 * 60 * 24); // Cache for 24 hours

      return images;
    },
  );
}
