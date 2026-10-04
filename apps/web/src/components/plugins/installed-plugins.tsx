"use client";

import {
  changeServerPluginVersion,
  installUploadedPlugin,
  saveServerPluginConfig,
  setServerPluginEnabled,
  uninstallServerPlugin,
} from "@/actions/plugins";
import ConfirmModal from "@/components/modals/confirm-modal";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generatePath, getErrorMessage } from "@/lib/utils";
import { routes } from "@/routes";
import type { InstalledPlugin, UploadedPlugin } from "@/types/plugins/catalog";
import { ServerError } from "@/types/responses";
import type { PluginConfig } from "@gcp/shared";
import {
  IconAlertTriangle,
  IconArrowUp,
  IconBuildingStore,
  IconDownload,
  IconHistory,
  IconSettings,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CapabilityBadges } from "./capability-list";
import { InstallDialog } from "./install-dialog";
import { PluginConfigForm } from "./plugin-config-form";

function ConfigDialog({ serverId, plugin }: { serverId: string; plugin: InstalledPlugin }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (!plugin.configSchema) return null;

  async function save(config: PluginConfig, cleared: string[]) {
    try {
      const { error } = await saveServerPluginConfig(serverId, plugin.pluginId, config, cleared);
      if (error) throw new ServerError(error, "SavePluginConfigError");
      toast.success("Settings saved");
      router.refresh();
      return true;
    } catch (error) {
      toast.error("Failed to save the settings", { description: getErrorMessage(error) });
      return false;
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" collapse="sm">
          <IconSettings />
          Configure
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plugin.name} settings</DialogTitle>
          <DialogDescription>Applied right away, no restart needed.</DialogDescription>
        </DialogHeader>
        {open && (
          <PluginConfigForm
            schema={plugin.configSchema}
            config={plugin.config}
            setSecrets={plugin.setSecrets}
            onSave={save}
            onClose={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function InstalledPluginCard({
  serverId,
  serverName,
  plugin,
}: {
  serverId: string;
  serverName: string;
  plugin: InstalledPlugin;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmUninstall, setConfirmUninstall] = useState(false);

  const target = {
    id: serverId,
    name: serverName,
    installedVersion: plugin.version,
    granted: plugin.grantedCapabilities,
  };
  const versions = plugin.versions.map((v) => ({
    version: v.version,
    capabilities: v.capabilities,
    disabled: v.yanked,
    note: v.yanked ? "withdrawn" : v.version === plugin.version ? "installed" : undefined,
  }));
  const switchVersion = (_: string, version: string, accepted: string[]) =>
    changeServerPluginVersion(serverId, plugin.pluginId, version, accepted);

  async function toggle(enabled: boolean) {
    setBusy(true);
    try {
      const { error } = await setServerPluginEnabled(serverId, plugin.pluginId, enabled);
      if (error) throw new ServerError(error, "TogglePluginError");
      toast.success(`${plugin.name} ${enabled ? "turned on" : "turned off"}`);
      router.refresh();
    } catch (error) {
      toast.error(`Failed to turn ${plugin.name} ${enabled ? "on" : "off"}`, {
        description: getErrorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  }

  async function uninstall() {
    try {
      const { error } = await uninstallServerPlugin(serverId, plugin.pluginId);
      if (error) throw new ServerError(error, "UninstallPluginError");
      toast.success(`${plugin.name} uninstalled`);
      router.refresh();
    } catch (error) {
      toast.error(`Failed to uninstall ${plugin.name}`, { description: getErrorMessage(error) });
    } finally {
      setConfirmUninstall(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Checkbox
            className="mt-1"
            checked={plugin.enabled}
            disabled={busy || (plugin.yanked && !plugin.enabled)}
            onCheckedChange={(checked) => toggle(checked === true)}
            aria-label={`Turn ${plugin.name} on or off`}
          />
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              {plugin.source === "marketplace" ? (
                <Link
                  href={generatePath(routes.plugins.detail, { slug: plugin.slug })}
                  className="font-semibold hover:underline"
                >
                  {plugin.name}
                </Link>
              ) : (
                <span className="font-semibold">{plugin.name}</span>
              )}
              <Badge variant="outline">{plugin.version}</Badge>
              <Badge variant="secondary">
                {plugin.source === "marketplace" ? "Marketplace" : "Private"}
              </Badge>
              {plugin.update && !plugin.yanked && <Badge>Update: {plugin.update.version}</Badge>}
            </div>
            {plugin.description && (
              <p className="text-sm text-muted-foreground">{plugin.description}</p>
            )}
            {plugin.commands.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Commands: {plugin.commands.map((c) => `/${c}`).join(", ")}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {plugin.update && (
            <InstallDialog
              name={plugin.name}
              targets={[target]}
              versions={versions}
              defaultVersion={plugin.update.version}
              install={switchVersion}
              trigger={
                <Button collapse="sm">
                  <IconArrowUp />
                  Update
                </Button>
              }
            />
          )}
          <ConfigDialog serverId={serverId} plugin={plugin} />
          {versions.length > 1 && (
            <InstallDialog
              name={plugin.name}
              targets={[target]}
              versions={versions}
              install={switchVersion}
              trigger={
                <Button variant="outline" collapse="sm" title="Switch to another version">
                  <IconHistory />
                  Versions
                </Button>
              }
            />
          )}
          <Button
            variant="outline"
            size="icon"
            title="Uninstall"
            onClick={() => setConfirmUninstall(true)}
          >
            <IconTrash />
          </Button>
        </div>
      </div>

      {plugin.yanked && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 p-3 text-sm">
          <IconAlertTriangle className="size-4 shrink-0 text-destructive" />
          <span>
            Version {plugin.version} was withdrawn from the marketplace
            {plugin.yankReason ? `: ${plugin.yankReason}` : ""}. It stays off until you install
            another version.
          </span>
        </div>
      )}

      <CapabilityBadges capabilities={plugin.grantedCapabilities} />

      <ConfirmModal
        isOpen={confirmUninstall}
        onClose={() => setConfirmUninstall(false)}
        onConfirm={uninstall}
        title={`Uninstall ${plugin.name}?`}
        description="This removes the plugin from this server, together with its settings and the data it stored."
        confirmText="Uninstall"
        cancelText="Cancel"
      />
    </Card>
  );
}

function InstallUpload({
  serverId,
  serverName,
  uploads,
}: {
  serverId: string;
  serverName: string;
  uploads: UploadedPlugin[];
}) {
  const [pluginId, setPluginId] = useState(uploads[0]?.pluginId ?? "");
  const plugin = uploads.find((p) => p.pluginId === pluginId);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select value={pluginId} onValueChange={setPluginId}>
        <SelectTrigger className="sm:w-64">
          <SelectValue placeholder="Choose an uploaded plugin" />
        </SelectTrigger>
        <SelectContent>
          {uploads.map((upload) => (
            <SelectItem key={upload.pluginId} value={upload.pluginId}>
              {upload.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {plugin && (
        <InstallDialog
          key={plugin.pluginId}
          name={plugin.name}
          targets={[{ id: serverId, name: serverName, installedVersion: null }]}
          versions={plugin.versions.map((v) => ({ version: v.version, capabilities: v.capabilities }))}
          install={(_, version, accepted) =>
            installUploadedPlugin(
              serverId,
              plugin.pluginId,
              plugin.versions.find((v) => v.version === version)?.id ?? "",
              accepted,
            )
          }
          trigger={
            <Button variant="outline">
              <IconDownload />
              Install uploaded plugin
            </Button>
          }
        />
      )}
    </div>
  );
}

// Marketplace and uploaded plugins on one server
export default function InstalledPlugins({
  serverId,
  serverName,
  plugins,
  uploads,
  marketplaceEnabled,
}: {
  serverId: string;
  serverName: string;
  plugins: InstalledPlugin[];
  uploads: UploadedPlugin[];
  marketplaceEnabled: boolean;
}) {
  const installable = uploads.filter(
    (upload) => !plugins.some((p) => p.pluginId === upload.pluginId),
  );

  return (
    <section aria-labelledby="installed-plugins-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 id="installed-plugins-title" className="text-lg font-semibold">
            Marketplace and uploaded plugins
          </h2>
          <p className="text-sm text-muted-foreground">
            They run in a sandbox with only the permissions you accepted. A plugin that misbehaves
            is turned off and the admins are notified.
          </p>
        </div>
        {marketplaceEnabled && (
          <Link href={routes.plugins.index} className={buttonVariants({ variant: "outline" })}>
            <IconBuildingStore />
            Browse marketplace
          </Link>
        )}
      </div>

      {installable.length > 0 && (
        <InstallUpload serverId={serverId} serverName={serverName} uploads={installable} />
      )}

      {plugins.length === 0 ? (
        <p className="text-sm text-muted-foreground">No marketplace or uploaded plugins on this server yet.</p>
      ) : (
        plugins.map((plugin) => (
          <InstalledPluginCard
            key={plugin.pluginId}
            serverId={serverId}
            serverName={serverName}
            plugin={plugin}
          />
        ))
      )}
    </section>
  );
}
