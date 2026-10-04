"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/utils";
import { ServerError, ServerResponse } from "@/types/responses";
import { addedCapabilities } from "@tmcp/shared";
import { IconDownload } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CapabilityList } from "./capability-list";

export interface InstallTarget {
  id: string;
  name: string;
  installedVersion: string | null;
  // Capabilities granted to the installed version
  granted?: string[];
  // Why this server can't get the plugin
  blocked?: string | null;
}

export interface InstallChoice {
  version: string;
  capabilities: string[];
  note?: string;
  disabled?: boolean;
}

// Install or switch versions on one server, after the admin accepts the capabilities
export function InstallDialog({
  name,
  trigger,
  targets,
  versions,
  defaultVersion,
  defaultServerId,
  install,
}: {
  name: string;
  trigger: React.ReactNode;
  targets: InstallTarget[];
  versions: InstallChoice[];
  defaultVersion?: string;
  defaultServerId?: string;
  install: (serverId: string, version: string, accepted: string[]) => Promise<ServerResponse>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverId, setServerId] = useState(defaultServerId ?? targets[0]?.id ?? "");
  const [version, setVersion] = useState(
    defaultVersion ?? versions.find((v) => !v.disabled)?.version ?? "",
  );
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  const target = targets.find((t) => t.id === serverId);
  const choice = versions.find((v) => v.version === version);
  const added = target?.granted ? addedCapabilities(target.granted, choice?.capabilities ?? []) : [];
  const same = target?.installedVersion === version;
  const action = !target?.installedVersion ? "Install" : same ? "Installed" : `Switch to ${version}`;

  async function submit() {
    if (!choice || !target) return;
    setBusy(true);
    try {
      const { error } = await install(target.id, choice.version, choice.capabilities);
      if (error) throw new ServerError(error, "InstallPluginError");
      toast.success(
        target.installedVersion
          ? `${name} ${choice.version} is now running on ${target.name}`
          : `${name} is installed on ${target.name}`,
      );
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(`Failed to install ${name}`, { description: getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setAccepted(false);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Install {name}</DialogTitle>
          <DialogDescription>
            Plugins run in a sandbox and can only do what you allow here.
          </DialogDescription>
        </DialogHeader>

        {targets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You are not an admin of any server, so there is nowhere to install it.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Server</Label>
              <Select value={serverId} onValueChange={(v) => { setServerId(v); setAccepted(false); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a server" />
                </SelectTrigger>
                <SelectContent>
                  {targets.map((t) => (
                    <SelectItem key={t.id} value={t.id} disabled={!!t.blocked}>
                      {t.name}
                      {t.installedVersion && ` (${t.installedVersion} installed)`}
                      {t.blocked && ` (${t.blocked})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Version</Label>
              <Select value={version} onValueChange={(v) => { setVersion(v); setAccepted(false); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a version" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.version} value={v.version} disabled={v.disabled}>
                      {v.version}
                      {v.note && ` (${v.note})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {choice && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <span className="text-sm font-medium">This version can</span>
                <CapabilityList capabilities={choice.capabilities} highlight={added} />
              </div>
            )}

            {choice && !same && (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="accept-capabilities"
                  checked={accepted}
                  onCheckedChange={(checked) => setAccepted(checked === true)}
                />
                <Label htmlFor="accept-capabilities" className="text-sm font-normal leading-snug">
                  I trust {name} with these permissions on {target?.name}
                </Label>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={submit}
            disabled={!choice || !target || same || !accepted || busy || !!target.blocked}
          >
            <IconDownload />
            {action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
