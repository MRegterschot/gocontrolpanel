"use client";
import { getHetznerLocations } from "@/actions/hetzner/locations";
import { getAllNetworks } from "@/actions/hetzner/networks";
import { getServerTypes } from "@/actions/hetzner/server-types";
import { getAllDatabases } from "@/actions/hetzner/servers";
import AdvancedServerSetupForm from "@/forms/admin/hetzner/setup-steps/advanced/server-setup-form";
import SimpleServerSetupForm from "@/forms/admin/hetzner/setup-steps/simple/server-setup-form";
import { getErrorMessage } from "@/lib/utils";
import { HetznerLocation } from "@/types/api/hetzner/locations";
import { HetznerNetwork } from "@/types/api/hetzner/networks";
import { HetznerServer, HetznerServerType } from "@/types/api/hetzner/servers";
import { HetznerSSHKey } from "@/types/api/hetzner/ssh-keys";
import { IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "../../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { DefaultModalProps } from "../default-props";
import { getSSHKeys } from "@/actions/hetzner/ssh-keys";

type Mode = "simple" | "advanced";

export default function AddServerSetupModal({
  closeModal,
  onSubmit,
  data,
}: DefaultModalProps<string>) {
  const [databases, setDatabases] = useState<HetznerServer[]>([]);
  const [networks, setNetworks] = useState<HetznerNetwork[]>([]);
  const [locations, setLocations] = useState<HetznerLocation[]>([]);
  const [serverTypes, setServerTypes] = useState<HetznerServerType[]>([]);
  const [sshKeys, setSshKeys] = useState<HetznerSSHKey[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      if (!data) return;
      setLoading(true);

      const [
        databasesResult,
        locationsResult,
        serverTypesResult,
        networksResult,
        sshKeysResult,
      ] = await Promise.allSettled([
        getAllDatabases(data),
        getHetznerLocations(data),
        getServerTypes(data),
        getAllNetworks(data),
        getSSHKeys(data),
      ]);

      // Handle databases
      if (databasesResult.status === "fulfilled") {
        const { data, error } = databasesResult.value;
        if (!error) {
          setDatabases(data);
        } else {
          toast.error("Failed to fetch existing databases", {
            description: error,
          });
        }
      } else {
        toast.error("Failed to fetch existing databases", {
          description: getErrorMessage(databasesResult.reason),
        });
      }

      // Handle locations
      if (locationsResult.status === "fulfilled") {
        const { data, error } = locationsResult.value;
        if (!error) {
          setLocations(data);
        } else {
          toast.error("Failed to fetch locations", { description: error });
          setError("Failed to get locations: " + error);
        }
      } else {
        toast.error("Failed to fetch locations", {
          description: getErrorMessage(locationsResult.reason),
        });
      }

      // Handle server types
      if (serverTypesResult.status === "fulfilled") {
        const { data, error } = serverTypesResult.value;
        if (!error) {
          setServerTypes(data);
        } else {
          toast.error("Failed to fetch server types", { description: error });
          setError("Failed to get server types: " + error);
        }
      } else {
        toast.error("Failed to fetch server types", {
          description: getErrorMessage(serverTypesResult.reason),
        });
      }

      // Handle networks
      if (networksResult.status === "fulfilled") {
        const { data, error } = networksResult.value;
        if (!error) {
          setNetworks(data);
        } else {
          toast.error("Failed to fetch networks", { description: error });
          setError("Failed to get networks: " + error);
        }
      } else {
        toast.error("Failed to fetch networks", {
          description: getErrorMessage(networksResult.reason),
        });
      }

      // Handle SSH keys
      if (sshKeysResult.status === "fulfilled") {
        const { data, error } = sshKeysResult.value;
        if (!error) {
          setSshKeys(data);
        } else {
          toast.error("Failed to fetch SSH keys", { description: error });
          setError("Failed to get SSH keys: " + error);
        }
      } else {
        toast.error("Failed to fetch SSH keys", {
          description: getErrorMessage(sshKeysResult.reason),
        });
      }

      setLoading(false);
    }

    fetch();
  }, []);

  const [mode, setMode] = useState<Mode>("simple");

  if (!data) return null;

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleSubmit = () => {
    onSubmit?.();
    closeModal?.();
  };

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-[400px] max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <h1 className="text-xl font-bold">Add Server</h1>

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
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>

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
    </Card>
  );
}
