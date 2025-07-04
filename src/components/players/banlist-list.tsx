"use client";

import { cleanBanList, getBanList } from "@/actions/gbx/player";
import { createColumns } from "@/app/(gocontroller)/server/[uuid]/players/banlist-columns";
import { getErrorMessage } from "@/lib/utils";
import { PlayerInfo } from "@/types/player";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import ConfirmModal from "../modals/confirm-modal";
import { DataTable } from "../table/data-table";
import { Button } from "../ui/button";

interface BanlistListProps {
  serverUuid: string;
}

export default function BanlistList({ serverUuid }: BanlistListProps) {
  const [banlist, setBanlist] = useState<PlayerInfo[]>([]);

  const [confirmClearBanlist, setConfirmClearBanlist] = useState(false);

  useEffect(() => {
    refetch();
  }, [serverUuid]);

  const refetch = async () => {
    try {
      const { data, error } = await getBanList(serverUuid);
      if (error) {
        throw new Error(error);
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
      const { error } = await cleanBanList(serverUuid);
      if (error) {
        throw new Error(error);
      }

      toast.success("Banlist cleared");
      refetch();
    } catch (error) {
      toast.error("Error clearing banlist", {
        description: getErrorMessage(error),
      });
    }
  };

  const columns = createColumns(serverUuid, refetch);

  return (
    <>
      <div className="flex items-center flex-row-reverse">
        <Button
          variant="destructive"
          onClick={() => setConfirmClearBanlist(true)}
        >
          <span className="text-sm">Clear Banlist</span>
        </Button>
      </div>
      <DataTable columns={columns} data={banlist} pagination />

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
