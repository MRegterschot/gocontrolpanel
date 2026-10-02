import {
  getAllSeasonalCampaigns,
  getCampaignWithMaps,
} from "@/actions/nadeo/campaigns";
import OfficialCampaignMaps from "../official-campaign-maps";
import OfficialCampaigns from "../official-campaigns";

export default async function SeasonalTab({
  serverId,
  fmHealth,
  campaign,
}: {
  serverId: string;
  fmHealth: boolean;
  campaign?: number;
}) {
  const { data: seasonalCampaignList } = await getAllSeasonalCampaigns();

  if (campaign && seasonalCampaignList) {
    const sc = seasonalCampaignList.find((c) => c.id === campaign);
    if (sc) {
      const { data: campaignWithMaps } = await getCampaignWithMaps(sc);
      return (
        <OfficialCampaignMaps
          serverId={serverId}
          fmHealth={fmHealth}
          campaign={campaignWithMaps}
        />
      );
    }
  } else {
    return (
      <OfficialCampaigns serverId={serverId} campaigns={seasonalCampaignList} />
    );
  }
}
