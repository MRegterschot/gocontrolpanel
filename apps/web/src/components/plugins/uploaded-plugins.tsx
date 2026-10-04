"use client";

import {
  changeServerPluginVersion,
  deleteUploadedPlugin,
  deleteUploadedPluginVersion,
  installUploadedPlugin,
  uploadPluginPackage,
} from "@/actions/plugins";
import ConfirmModal from "@/components/modals/confirm-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/utils";
import type { ServerSummary } from "@/lib/plugin-access";
import type { UploadedPlugin } from "@/types/plugins/catalog";
import { ServerError } from "@/types/responses";
import { IconDownload, IconTrash, IconUpload } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CapabilityBadges } from "./capability-list";
import { InstallDialog } from "./install-dialog";

const SDK_GUIDE = "https://github.com/MRegterschot/tmcontrolpanel/blob/master/docs/plugin-sdk.md";

function UploadDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data, error } = await uploadPluginPackage(form);
      if (error) throw new ServerError(error, "UploadPluginError");
      toast.success(`Uploaded ${data.name} ${data.version}`, {
        description: "Install it on one of your servers to try it.",
      });
      setOpen(false);
      setFile(null);
      router.refresh();
    } catch (error) {
      toast.error("Failed to upload the plugin", { description: getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IconUpload />
          Upload plugin
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a plugin</DialogTitle>
          <DialogDescription>
            A zip made with <code>tmcp-plugin pack</code>. Uploaded plugins are private: only you can
            install them, on servers you are an admin of. They are not reviewed, but run in the
            same sandbox as marketplace plugins.
          </DialogDescription>
        </DialogHeader>
        <Input type="file" accept=".zip,application/zip" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <DialogFooter>
          <Button onClick={upload} disabled={!file || busy}>
            <IconUpload />
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadedPluginCard({ plugin, servers }: { plugin: UploadedPlugin; servers: ServerSummary[] }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<{ title: string; run: () => Promise<{ error?: string }> } | null>(null);

  const targets = servers.map((server) => ({
    id: server.id,
    name: server.name,
    installedVersion: plugin.installedOn.find((i) => i.serverId === server.id)?.version ?? null,
  }));

  async function runConfirmed() {
    if (!confirm) return;
    try {
      const { error } = await confirm.run();
      if (error) throw new ServerError(error, "DeletePluginError");
      toast.success("Deleted");
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete", { description: getErrorMessage(error) });
    } finally {
      setConfirm(null);
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-semibold">
            {plugin.name} <span className="text-sm font-normal text-muted-foreground">{plugin.slug}</span>
          </span>
          {plugin.description && <p className="text-sm text-muted-foreground">{plugin.description}</p>}
          {plugin.owner && <span className="text-xs text-muted-foreground">Uploaded by {plugin.owner}</span>}
        </div>
        <div className="flex gap-2">
          <InstallDialog
            name={plugin.name}
            targets={targets}
            versions={plugin.versions.map((v) => ({ version: v.version, capabilities: v.capabilities }))}
            install={(serverId, version, accepted) => {
              const target = targets.find((t) => t.id === serverId);
              const chosen = plugin.versions.find((v) => v.version === version);
              return target?.installedVersion
                ? changeServerPluginVersion(serverId, plugin.pluginId, version, accepted)
                : installUploadedPlugin(serverId, plugin.pluginId, chosen?.id ?? "", accepted);
            }}
            trigger={
              <Button variant="outline">
                <IconDownload />
                Install
              </Button>
            }
          />
          <Button
            variant="outline"
            size="icon"
            title="Delete the plugin"
            onClick={() =>
              setConfirm({
                title: `Delete ${plugin.name} and all its versions?`,
                run: () => deleteUploadedPlugin(plugin.pluginId),
              })
            }
          >
            <IconTrash />
          </Button>
        </div>
      </div>

      <div className="flex flex-col divide-y rounded-md border">
        {plugin.versions.map((version) => (
          <div key={version.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">
                {version.version}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  {(version.size / 1024).toFixed(1)} KB · {new Date(version.createdAt).toLocaleString()}
                  {version.installs > 0 && ` · on ${version.installs} server${version.installs === 1 ? "" : "s"}`}
                </span>
              </span>
              <CapabilityBadges capabilities={version.capabilities} />
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={version.installs > 0}
              title={version.installs > 0 ? "Uninstall it from its servers first" : "Delete this version"}
              onClick={() =>
                setConfirm({
                  title: `Delete version ${version.version}?`,
                  run: () => deleteUploadedPluginVersion(version.id),
                })
              }
            >
              <IconTrash />
              Delete
            </Button>
          </div>
        ))}
      </div>

      {plugin.installedOn.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {plugin.installedOn.map((install) => (
            <Badge key={install.serverId} variant="secondary">
              {install.serverName}: {install.version}
            </Badge>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirmed}
        title={confirm?.title ?? ""}
        description="This can't be undone. Servers keep running the versions they have installed."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </Card>
  );
}

export default function UploadedPlugins({
  uploads,
  servers,
  canUpload,
}: {
  uploads: UploadedPlugin[];
  servers: ServerSummary[];
  canUpload: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Private plugins you uploaded. Build one with the{" "}
          <a href={SDK_GUIDE} target="_blank" rel="noopener noreferrer" className="underline">
            plugin SDK
          </a>
          , or submit it to the marketplace once it is ready for others.
        </p>
        {canUpload && <UploadDialog />}
      </div>

      {uploads.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No uploaded plugins yet.</p>
      ) : (
        uploads.map((plugin) => (
          <UploadedPluginCard key={plugin.pluginId} plugin={plugin} servers={servers} />
        ))
      )}
    </div>
  );
}
