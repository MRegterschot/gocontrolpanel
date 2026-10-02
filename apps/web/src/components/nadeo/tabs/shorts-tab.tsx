import { getCampaignWithMaps } from "@/actions/nadeo/campaigns";
import { getAllWeeklyShorts } from "@/actions/nadeo/shorts";
import OfficialCampaignMaps from "../official-campaign-maps";
import OfficialCampaigns from "../official-campaigns";

export default async function ShortsTab({
  serverId,
  fmHealth,
  campaign,
}: {
  serverId: string;
  fmHealth: boolean;
  campaign?: number;
}) {
  const { data: weeklyShortsList } = await getAllWeeklyShorts();

  if (campaign && weeklyShortsList) {
    const sc = weeklyShortsList.find((c) => c.id === campaign);
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
      <OfficialCampaigns serverId={serverId} campaigns={weeklyShortsList} />
    );
  }
}
