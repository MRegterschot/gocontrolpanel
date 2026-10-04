"use client";

import { cleanBanList } from "@/actions/gbx/player";
import { createColumns } from "@/app/(gocontroller)/server/[id]/players/banlist-columns";
import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import { getBanList } from "@/lib/api-client/gbx";
import { queryKeys, unwrap } from "@/lib/api-client/query";
import { getErrorMessage } from "@/lib/utils";
import { ServerError } from "@/types/responses";
import { IconTrash } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import ConfirmModal from "../modals/confirm-modal";
import { DataTable } from "../table/data-table";
import { Button } from "../ui/button";

interface BanlistListProps {
  serverId: string;
}

export default function BanlistList({ serverId }: BanlistListProps) {
  const [confirmClearBanlist, setConfirmClearBanlist] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.banlist(serverId),
    queryFn: () => unwrap(getBanList(serverId), "GetBanListError"),
  });
  useQueryErrorToast(query.error, "Error fetching banlist");

  const refetch = async () => {
    await query.refetch();
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
        data={query.data ?? []}
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
