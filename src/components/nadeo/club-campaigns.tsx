import { PaginationTable } from "../table/pagination-table";
import { createColumns } from "./club-campaign-columns";

export default function ClubCampaigns({ serverId }: { serverId: string }) {
  return (
    <PaginationTable
      createColumns={createColumns}
      endpoint={"/api/nadeo/club-campaigns"}
      filter
      args={serverId}
    />
  );
}
