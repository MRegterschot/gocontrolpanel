import { getClubCampaignsPaginated } from "@/actions/nadeo/clubs";
import { PaginationTable } from "../table/pagination-table";
import { createColumns } from "./club-campaign-columns";

export default function ClubCampaigns({ serverId }: { serverId: string }) {
  return (
    <PaginationTable
      createColumns={createColumns}
      fetchData={getClubCampaignsPaginated}
      filter
      args={serverId}
    />
  );
}
