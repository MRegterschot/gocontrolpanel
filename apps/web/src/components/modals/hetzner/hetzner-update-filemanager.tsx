"use client";

import { updateFileManagers } from "@/actions/hetzner/server-actions";
import { ModalContent } from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/utils";
import { ServerError } from "@/types/responses";
import { IconRefresh } from "@tabler/icons-react";
import { useState } from "react";
import { DefaultModalProps } from "../default-props";

export default function HetznerUpdateFileManagerModal({
  data,
}: DefaultModalProps<{
  projectId: string;
  serverId: number;
  serverName: string;
}>) {
  const [output, setOutput] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  if (!data) return null;

  const run = async () => {
    setIsRunning(true);
    setError(null);
    setOutput(null);
    setSuccess(null);

    try {
      const { data: result, error } = await updateFileManagers(
        data.projectId,
        data.serverId,
      );
      if (error) {
        throw new ServerError(error, "UpdateFileManagersError");
      }
      setOutput(result.output);
      setSuccess(result.success);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <ModalContent className="max-w-[min(56rem,calc(100vw-2rem))]">
      <DialogHeader className="pr-6">
        <DialogTitle>Update File Managers</DialogTitle>
      </DialogHeader>

      <p className="text-sm text-muted-foreground">
        Pulls the latest file manager image on {data.serverName} and restarts
        the file manager of every running stack. The file manager is briefly
        unavailable while it restarts. The log appears when the update is done.
      </p>

      <div className="flex items-center gap-2">
        <Button onClick={run} disabled={isRunning}>
          <IconRefresh className={isRunning ? "animate-spin" : undefined} />
          {isRunning ? "Updating..." : "Update"}
        </Button>
        {success !== null && (
          <span
            className={
              success ? "text-sm text-green-500" : "text-sm text-destructive"
            }
          >
            {success ? "Update finished" : "Update failed, see the log"}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <pre className="max-h-[55vh] overflow-auto rounded-md border bg-muted/30 p-3 whitespace-pre-wrap wrap-break-word text-sm">
        {output ??
          (isRunning ? "Running, this can take a minute..." : "No log yet.")}
      </pre>
    </ModalContent>
  );
}
