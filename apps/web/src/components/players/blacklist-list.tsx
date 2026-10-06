"use client";

import { createColumns } from "@/app/(gocontroller)/server/[id]/players/blacklist-columns";
import BlacklistForm from "@/forms/server/players/blacklist-form";
import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import { getBlacklist } from "@/lib/api-client/gbx";
import { queryKeys, unwrap } from "@/lib/api-client/query";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "../table/data-table";

interface BlacklistListProps {
  serverId: string;
}

export default function BlacklistList({ serverId }: BlacklistListProps) {
  const query = useQuery({
    queryKey: queryKeys.blacklist(serverId),
    queryFn: () => unwrap(getBlacklist(serverId), "GetBlacklistError"),
  });
  useQueryErrorToast(query.error, "Error fetching blacklist");

  const refetch = async () => {
    await query.refetch();
  };

  const columns = createColumns(serverId, refetch);

  return (
    <DataTable
      columns={columns}
      data={query.data ?? []}
      actions={<BlacklistForm serverId={serverId} refetch={refetch} />}
      pagination
    />
  );
}
