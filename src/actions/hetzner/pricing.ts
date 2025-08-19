"use server";
import { doServerActionWithAuth } from "@/lib/actions";
import { axiosHetzner } from "@/lib/axios/hetzner";
import { getKeyHetznerPricing, getRedisClient } from "@/lib/redis";
import { HetznerPricingResponse } from "@/types/api/hetzner/pricing";
import { ServerResponse } from "@/types/responses";
import { getApiToken } from "./util";

export async function getHetznerPricing(
  projectId: string,
): Promise<ServerResponse<HetznerPricingResponse["pricing"]>> {
  return doServerActionWithAuth(
    ["hetzner:view", `hetzner:${projectId}:admin`],
    async () => {
      const redis = await getRedisClient();
      const key = getKeyHetznerPricing();

      const cachedData = await redis.get(key);
      if (cachedData) {
        return JSON.parse(cachedData) as HetznerPricingResponse["pricing"];
      }

      const token = await getApiToken(projectId);
      const res = await axiosHetzner.get<HetznerPricingResponse>("/pricing", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const pricingData = res.data.pricing;
      await redis.set(key, JSON.stringify(pricingData), "EX", 60 * 60 * 6); // Cache for 6 hours

      return pricingData;
    },
  );
}