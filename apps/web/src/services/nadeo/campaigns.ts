import { doServerActionWithAuth } from "@/lib/actions";
import { getSeasonalCampaigns } from "@/lib/api/nadeo";
import { logger } from "@/lib/logger";
import {
  getKeyCampaign,
  getKeySeasonalCampaigns,
  getRedisClient,
} from "@/lib/redis";
import { getMapsByUids } from "@/services/database/maps";
import { Campaign, CampaignWithNamesAndPlaylistMaps } from "@/types/api/nadeo";
import { ServerError, ServerResponse } from "@/types/responses";
import "server-only";

export async function getAllSeasonalCampaigns(): Promise<
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
      const key = getKeySeasonalCampaigns();

      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      const seasonalCampaignListResponse = await getSeasonalCampaigns(100);

      await redis.set(
        key,
        JSON.stringify(seasonalCampaignListResponse.campaignList),
        "EX",
        seasonalCampaignListResponse.relativeNextRequest,
      );

      return seasonalCampaignListResponse.campaignList;
    },
  );
}

export async function getCampaignWithMaps(
  campaign: Campaign,
): Promise<ServerResponse<CampaignWithNamesAndPlaylistMaps>> {
  return doServerActionWithAuth(
    [
      "servers::moderator",
      "servers::admin",
      "group:servers::moderator",
      "group:servers::admin",
    ],
    async () => {
      const meta = {
        type: "nadeo",
        module: "campaigns",
        function: "getCampaignWithMaps",
      };

      const redis = await getRedisClient();
      const key = getKeyCampaign(campaign.id);

      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      if (campaign.playlist.length === 0)
        return campaign as CampaignWithNamesAndPlaylistMaps;

      const mapUids = campaign.playlist.map((p) => p.mapUid);
      const { data: maps, error } = await getMapsByUids(mapUids);
      if (error) {
        logger.error(
          { meta, error, campaignId: campaign.id },
          "Failed to get maps",
        );
        throw new ServerError(error, "GetMapsByUidsError");
      }

      const response = {
        ...campaign,
        playlist: campaign.playlist
          .map((p) => ({
            ...p,
            map: maps?.find((m) => m.uid === p.mapUid),
          }))
          .filter((p) => p.map !== undefined),
      } as CampaignWithNamesAndPlaylistMaps;

      await redis.set(
        key,
        JSON.stringify(response),
        "EX",
        15 * 60, // Cache for 15 minutes
      );

      return response;
    },
  );
}
