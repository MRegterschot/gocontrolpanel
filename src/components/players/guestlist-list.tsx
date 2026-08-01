"use client";

import { getGuestlist } from "@/actions/gbx/player";
import { createColumns } from "@/app/(gocontroller)/server/[id]/players/guestlist-columns";
import GuestlistForm from "@/forms/server/players/guestlist-form";
import { getErrorMessage } from "@/lib/utils";
import { PlayerInfo } from "@/types/player";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "../table/data-table";
import { ServerError } from "@/types/responses";

interface GuestlistListProps {
  serverId: string;
}

export default function GuestlistList({ serverId }: GuestlistListProps) {
  const [guestlist, setGuestlist] = useState<PlayerInfo[]>([]);

  const refetch = async () => {
    try {
      const { data, error } = await getGuestlist(serverId);
      if (error) {
        throw new ServerError(error, "GetGuestlistError");
      }

      setGuestlist(data);
    } catch (error) {
      toast.error("Error fetching guest list", {
        description: getErrorMessage(error),
      });
    }
  };

  const columns = createColumns(serverId, refetch);

  return (
    <DataTable
      columns={columns}
      data={guestlist}
      pagination
      actions={<GuestlistForm serverId={serverId} refetch={refetch} />}
    />
  );
}
