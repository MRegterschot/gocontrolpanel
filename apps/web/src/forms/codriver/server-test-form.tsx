"use client";
import { testCodriverRequest } from "@/actions/codriver";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { codriverRequestsPath } from "@/lib/api-client/codriver";
import { queryKeys } from "@/lib/api-client/query";
import { getErrorMessage } from "@/lib/utils";
import { ServerError } from "@/types/responses";
import { IconSend } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export default function ServerCodriverTestForm({
  serverId,
}: {
  serverId: string;
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    status: string;
    reply: string;
  } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await testCodriverRequest(serverId, text.trim());
      if (error) throw new ServerError(error, "TestCodriverRequestError");
      setResult(data ?? null);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.codriverServer(serverId),
        }),
        queryClient.invalidateQueries({
          queryKey: ["paginated", codriverRequestsPath(serverId)],
        }),
      ]);
    } catch (error) {
      toast.error("Failed to plan request", {
        description: getErrorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Textarea
        aria-label="Test request"
        placeholder="e.g. skip to the next map"
        maxLength={300}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy || !text.trim()}>
          <IconSend />
          {busy ? "Planning..." : "Plan request"}
        </Button>
        <span className="text-xs text-muted-foreground">{text.length}/300</span>
      </div>
      {result && (
        <div className="flex flex-col gap-2 rounded-md border p-3">
          <div className="flex items-center gap-2 text-sm">
            Status: <Badge variant="outline">{result.status}</Badge>
          </div>
          <p className="whitespace-pre-wrap text-sm">{result.reply}</p>
        </div>
      )}
    </form>
  );
}
