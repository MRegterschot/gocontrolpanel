import { PaginationTable } from "../../table/pagination-table";
import { createColumns } from "./club-columns";

export default function Clubs({ serverId }: { serverId: string }) {
  return (
    <PaginationTable
      createColumns={createColumns}
      endpoint={"/api/nadeo/clubs"}
      filter
      args={serverId}
    />
  );
}
