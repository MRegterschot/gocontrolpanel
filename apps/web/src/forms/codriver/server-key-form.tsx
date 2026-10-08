"use client";
import { setCodriverServerKey } from "@/actions/codriver";
import ConfirmModal from "@/components/modals/confirm-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { queryKeys } from "@/lib/api-client/query";
import { getErrorMessage } from "@/lib/utils";
import { ServerError } from "@/types/responses";
import { IconDeviceFloppy, IconTrash } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export default function ServerCodriverKeyForm({
  serverId,
  keyHint,
}: {
  serverId: string;
  keyHint: string | null;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  async function write(key: string | null) {
    setBusy(true);
    try {
      const { error } = await setCodriverServerKey(serverId, key);
      if (error) throw new ServerError(error, "SetCodriverKeyError");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.codriverServer(serverId),
      });
      setValue("");
      toast.success(key === null ? "API key removed" : "API key saved");
    } catch (error) {
      toast.error(
        key === null ? "Failed to remove API key" : "Failed to save API key",
        { description: getErrorMessage(error) },
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {keyHint && (
        <p className="text-sm">
          Stored key: <span className="font-mono">{keyHint}</span>
        </p>
      )}
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void write(value.trim());
        }}
      >
        <Input
          type="password"
          autoComplete="off"
          aria-label="Anthropic API key"
          placeholder={keyHint ? "Replace the stored key" : "Anthropic API key"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="max-w-md flex-1"
        />
        <Button type="submit" disabled={busy || value.trim().length < 20}>
          <IconDeviceFloppy />
          Save
        </Button>
        {keyHint && (
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={() => setConfirmRemove(true)}
          >
            <IconTrash />
            Remove
          </Button>
        )}
      </form>
      <ConfirmModal
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={() => void write(null)}
        title="Remove API key"
        description="Codriver on this server will fall back to the panel's shared key, if there is one."
        confirmText="Remove"
        cancelText="Cancel"
      />
    </div>
  );
}
