import { apiRoute, intParam, parse } from "@/lib/api-route";
import { getClubCampaignWithMaps } from "@/services/nadeo/clubs";
import { z } from "zod";

export const GET = apiRoute<{ clubId: string; campaignId: string }>(
  async ({ params }) => {
    const p = parse(
      z.object({ clubId: intParam, campaignId: intParam }),
      params,
    );
    return getClubCampaignWithMaps(p.clubId, p.campaignId);
  },
);
