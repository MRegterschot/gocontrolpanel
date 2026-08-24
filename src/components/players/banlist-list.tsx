"use client";

import { cleanBanList, getBanList } from "@/actions/gbx/player";
import { createColumns } from "@/app/(gocontroller)/server/[id]/players/banlist-columns";
import { getErrorMessage } from "@/lib/utils";
import { PlayerInfo } from "@/types/player";
import { ServerError } from "@/types/responses";
import { IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import ConfirmModal from "../modals/confirm-modal";
import { DataTable } from "../table/data-table";
import { Button } from "../ui/button";

interface BanlistListProps {
  serverId: string;
}

export default function BanlistList({ serverId }: BanlistListProps) {
  const [banlist, setBanlist] = useState<PlayerInfo[]>([]);

  const [confirmClearBanlist, setConfirmClearBanlist] = useState(false);

  useEffect(() => {
    refetch();
  }, [serverId]);

  const refetch = async () => {
    try {
      const { ok, data, error } = await getBanList(serverId);
      if (!ok) {
        throw new ServerError(error, "GetBanListError");
      }

      setBanlist(data);
    } catch (error) {
      toast.error("Error fetching banlist", {
        description: getErrorMessage(error),
      });
    }
  };

  const handleClearBanlist = async () => {
    try {
      const { error } = await cleanBanList(serverId);
      if (error) {
        throw new ServerError(error, "CleanBanListError");
      }

      toast.success("Banlist cleared");
      refetch();
    } catch (error) {
      toast.error("Error clearing banlist", {
        description: getErrorMessage(error),
      });
    }
  };

  const columns = createColumns(serverId, refetch);

  return (
    <>
      <DataTable
        columns={columns}
        data={banlist}
        actions={
          <Button
            variant="destructive"
            onClick={() => setConfirmClearBanlist(true)}
          >
            <IconTrash />
            <span className="text-sm">Clear Banlist</span>
          </Button>
        }
        pagination
      />

      <ConfirmModal
        title="Clear Banlist"
        description="Are you sure you want to clear the banlist? This action cannot be undone."
        onConfirm={handleClearBanlist}
        onClose={() => setConfirmClearBanlist(false)}
        isOpen={confirmClearBanlist}
        confirmText="Clear Banlist"
        cancelText="Cancel"
      />
    </>
  );
}
