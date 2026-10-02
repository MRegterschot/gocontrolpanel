import { getClubsPaginated } from "@/actions/nadeo/clubs";
import { PaginationTable } from "../../table/pagination-table";
import { createColumns } from "./club-columns";

export default function Clubs({ serverId }: { serverId: string }) {
  return (
    <PaginationTable
      createColumns={createColumns}
      fetchData={getClubsPaginated}
      filter
      args={serverId}
    />
  );
}
