"use client";

import { exportRecords } from "@/actions/database/records";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/utils";
import { IconDownload } from "@tabler/icons-react";
import { toast } from "sonner";

export default function ServerRecordsActions({
  serverId,
}: {
  serverId: string;
}) {
  const handleExport = async () => {
    try {
      const { data, error } = await exportRecords(serverId);
      if (error) {
        throw new Error(error);
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `records_${serverId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Failed to export records", {
        description: getErrorMessage(err),
      });
    }
  };

  return (
    <Button onClick={handleExport} variant="outline">
      Export Records
      <IconDownload />
    </Button>
  );
}
