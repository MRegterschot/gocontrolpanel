import { getLogs } from "@/actions/hetzner/server-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HetznerServer } from "@/types/api/hetzner/servers";
import { IconX } from "@tabler/icons-react";
import { useState } from "react";
import { DefaultModalProps } from "../default-props";
import { ServerError } from "@/types/responses";

export default function HetznerLogsModal({
  closeModal,
  data,
}: DefaultModalProps<{
  projectId: string;
  server: HetznerServer;
  serverNumber: number;
}>) {
  const [selectedLogType, setSelectedLogType] = useState<
    "dedicated" | "filemanager" | "servercontroller"
  >("dedicated");
  const [logs, setLogs] = useState<string | null>(null);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  if (!data) return null;

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const loadLogs = async () => {
    try {
      setIsLoadingLogs(true);
      setLogsError(null);

      const { data: logData, error } = await getLogs(
        data.projectId,
        data.server.id,
        data.serverNumber,
        selectedLogType,
      );

      if (error) {
        throw new ServerError(error, "GetLogsError");
      }

      setLogs(logData || "");
    } catch (error) {
      setLogs("");
      setLogsError(
        error instanceof Error
          ? error.message
          : `Failed to get logs for server ${data.serverNumber + 1}`,
      );
    } finally {
      setIsLoadingLogs(false);
    }
  };

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-100 max-sm:w-full max-h-[90vh] overflow-y-auto max-w-4xl"
    >
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Logs</h1>

        <div className="flex gap-4 items-center">
          <Select
            value={selectedLogType}
            onValueChange={(value) =>
              setSelectedLogType(
                value as "dedicated" | "filemanager" | "servercontroller",
              )
            }
          >
            <SelectTrigger
              className="flex **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="dedicated" />
            </SelectTrigger>
            <SelectContent className="rounded-xl z-9999">
              <SelectItem value="dedicated" className="rounded-lg">
                Dedicated server
              </SelectItem>
              <SelectItem value="filemanager" className="rounded-lg">
                Filemanager
              </SelectItem>
              <SelectItem value="servercontroller" className="rounded-lg">
                Server controller
              </SelectItem>
            </SelectContent>
          </Select>

          <IconX
            className="h-6 w-6 cursor-pointer text-muted-foreground"
            onClick={closeModal}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={loadLogs} disabled={isLoadingLogs}>
          {isLoadingLogs ? "Loading..." : "Refresh Logs"}
        </Button>
      </div>

      {logsError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {logsError}
        </div>
      ) : (
        <pre className="max-h-[55vh] overflow-auto rounded-md border bg-muted/30 p-3 whitespace-pre-wrap wrap-break-word text-sm">
          {logs || (isLoadingLogs ? "Loading logs..." : "No logs loaded yet.")}
        </pre>
      )}
    </Card>
  );
}
