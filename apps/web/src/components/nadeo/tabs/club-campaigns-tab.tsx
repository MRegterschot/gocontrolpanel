import { getClubCampaignWithMaps } from "@/actions/nadeo/clubs";
import ClubCampaignMaps from "../club-campaign-maps";
import ClubCampaigns from "../club-campaigns";

export default async function ClubCampaignsTab({
  serverId,
  fmHealth,
  clubId,
  campaignId,
}: {
  serverId: string;
  fmHealth: boolean;
  clubId?: number;
  campaignId?: number;
}) {
  if (clubId && campaignId) {
    const { data } = await getClubCampaignWithMaps(clubId, campaignId);

    return (
      <ClubCampaignMaps
        serverId={serverId}
        fmHealth={fmHealth}
        clubCampaign={data}
      />
    );
  } else {
    return <ClubCampaigns serverId={serverId} />;
  }
}
