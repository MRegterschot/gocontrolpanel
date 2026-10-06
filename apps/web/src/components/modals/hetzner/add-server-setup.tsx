"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AdvancedServerSetupForm from "@/forms/admin/hetzner/setup-steps/advanced/server-setup-form";
import SimpleServerSetupForm from "@/forms/admin/hetzner/setup-steps/simple/server-setup-form";
import {
  useHetznerDatabases,
  useHetznerLocations,
  useHetznerNetworks,
  useHetznerServerTypes,
  useHetznerSshKeys,
} from "@/hooks/use-hetzner-queries";
import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import { getErrorMessage } from "@/lib/utils";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { DefaultModalProps } from "../default-props";

type Mode = "simple" | "advanced";

export default function AddServerSetupModal({
  closeModal,
  onSubmit,
  data,
}: DefaultModalProps<string>) {
  const projectId = data ?? "";

  const databasesQuery = useHetznerDatabases(projectId);
  const locationsQuery = useHetznerLocations(projectId);
  const serverTypesQuery = useHetznerServerTypes(projectId);
  const networksQuery = useHetznerNetworks(projectId);
  const sshKeysQuery = useHetznerSshKeys(projectId);

  const databases = databasesQuery.data ?? [];
  const locations = locationsQuery.data ?? [];
  const serverTypes = serverTypesQuery.data ?? [];
  const networks = networksQuery.data ?? [];
  const sshKeys = sshKeysQuery.data ?? [];

  const loading = [
    databasesQuery,
    locationsQuery,
    serverTypesQuery,
    networksQuery,
    sshKeysQuery,
  ].some((q) => q.isPending);

  // A missing database list only hides the "use existing database" choice, the rest is required
  const failure = [
    ["locations", locationsQuery.error],
    ["server types", serverTypesQuery.error],
    ["networks", networksQuery.error],
    ["SSH keys", sshKeysQuery.error],
  ].find(([, e]) => e);
  const error = failure
    ? `Failed to get ${failure[0]}: ${getErrorMessage(failure[1])}`
    : null;

  useQueryErrorToast(
    databasesQuery.error,
    "Failed to fetch existing databases",
  );
  useQueryErrorToast(locationsQuery.error, "Failed to fetch locations");
  useQueryErrorToast(serverTypesQuery.error, "Failed to fetch server types");
  useQueryErrorToast(networksQuery.error, "Failed to fetch networks");
  useQueryErrorToast(sshKeysQuery.error, "Failed to fetch SSH keys");

  const [mode, setMode] = useState<Mode>("simple");

  if (!data) return null;

  const handleSubmit = () => {
    onSubmit?.();
    closeModal?.();
  };

  return (
    <ModalContent className="max-w-[min(64rem,calc(100vw-2rem))]">
      <DialogHeader className="flex-row flex-wrap items-center justify-between pr-6">
        <div className="flex gap-4 items-center">
          <DialogTitle>Add Server</DialogTitle>

          <Select
            value={mode}
            onValueChange={(value) => setMode(value as Mode)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-9999">
              <SelectItem
                value={"simple"}
                className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap"
              >
                Simple
              </SelectItem>
              <SelectItem
                value={"advanced"}
                className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap"
              >
                Advanced
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </DialogHeader>

      {loading && <span className="text-muted-foreground">Loading...</span>}

      {error && <span>{error}</span>}

      {!loading && !error && (
        <>
          {mode === "simple" && (
            <SimpleServerSetupForm
              projectId={data}
              callback={handleSubmit}
              locations={locations}
              databases={databases}
              serverTypes={serverTypes}
              sshKeys={sshKeys}
            />
          )}

          {mode === "advanced" && (
            <AdvancedServerSetupForm
              projectId={data}
              callback={handleSubmit}
              locations={locations}
              databases={databases}
              serverTypes={serverTypes}
              networks={networks}
              sshKeys={sshKeys}
            />
          )}
        </>
      )}
    </ModalContent>
  );
}
