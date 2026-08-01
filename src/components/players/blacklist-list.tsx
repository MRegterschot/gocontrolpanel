"use client";

import { getBlacklist } from "@/actions/gbx/player";
import { createColumns } from "@/app/(gocontroller)/server/[id]/players/blacklist-columns";
import BlacklistForm from "@/forms/server/players/blacklist-form";
import { getErrorMessage } from "@/lib/utils";
import { PlayerInfo } from "@/types/player";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "../table/data-table";
import { ServerError } from "@/types/responses";

interface BlacklistListProps {
  serverId: string;
}

export default function BlacklistList({ serverId }: BlacklistListProps) {
  const [blacklist, setBlacklist] = useState<PlayerInfo[]>([]);

  const refetch = async () => {
    try {
      const { data, error } = await getBlacklist(serverId);
      if (error) {
        throw new ServerError(error, "GetBlacklistError");
      }

      setBlacklist(data);
    } catch (error) {
      toast.error("Error fetching blacklist", {
        description: getErrorMessage(error),
      });
    }
  };

  const columns = createColumns(serverId, refetch);

  return (
    <DataTable
      columns={columns}
      data={blacklist}
      actions={<BlacklistForm serverId={serverId} refetch={refetch} />}
      pagination
    />
  );
}
