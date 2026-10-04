"use client";

import { createColumns } from "@/app/(tmcontrolpanel)/server/[id]/players/guestlist-columns";
import GuestlistForm from "@/forms/server/players/guestlist-form";
import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import { getGuestlist } from "@/lib/api-client/gbx";
import { queryKeys, unwrap } from "@/lib/api-client/query";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "../table/data-table";

interface GuestlistListProps {
  serverId: string;
}

export default function GuestlistList({ serverId }: GuestlistListProps) {
  const query = useQuery({
    queryKey: queryKeys.guestlist(serverId),
    queryFn: () => unwrap(getGuestlist(serverId), "GetGuestlistError"),
  });
  useQueryErrorToast(query.error, "Error fetching guest list");

  const refetch = async () => {
    await query.refetch();
  };

  const columns = createColumns(serverId, refetch);

  return (
    <DataTable
      columns={columns}
      data={query.data ?? []}
      pagination
      actions={<GuestlistForm serverId={serverId} refetch={refetch} />}
    />
  );
}
