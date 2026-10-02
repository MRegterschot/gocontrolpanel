"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getShortsCampaigns } from "@/lib/api/nadeo";
import { getKeyWeeklyShorts, getRedisClient } from "@/lib/redis";
import { Campaign } from "@/types/api/nadeo";
import { ServerResponse } from "@/types/responses";

export async function getAllWeeklyShorts(): Promise<
  ServerResponse<Campaign[]>
> {
  return doServerActionWithAuth(
    [
      "servers::moderator",
      "servers::admin",
      "group:servers::moderator",
      "group:servers::admin",
    ],
    async () => {
      const redis = await getRedisClient();
      const key = getKeyWeeklyShorts();

      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      const weeklyShortsListResponse: Campaign[] = [];
      const BATCH_SIZE = 100;
      let total = 0;
      let fetched = 0;
      let relativeNextRequest = 0;
      do {
        const response = await getShortsCampaigns(BATCH_SIZE, fetched);
        total = response.itemCount;
        fetched += BATCH_SIZE;
        weeklyShortsListResponse.push(...response.campaignList);
        relativeNextRequest = response.relativeNextRequest;
      } while (fetched < total);

      await redis.set(
        key,
        JSON.stringify(weeklyShortsListResponse),
        "EX",
        relativeNextRequest,
      );

      return weeklyShortsListResponse;
    },
  );
}
