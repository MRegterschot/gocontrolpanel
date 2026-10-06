"use client";

import { reloadServerPlugins } from "@/actions/database/server-plugins";
import {
  changeServerPluginVersion,
  installMarketplacePlugin,
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
import { exportServerPluginConfig } from "@/lib/api-client/database";
import { generatePath, getErrorMessage } from "@/lib/utils";
import { routes } from "@/routes";
import type { AvailablePlugin, InstalledPlugin } from "@/types/plugins/catalog";
import { ServerError } from "@/types/responses";
import type { PluginConfig, ServerAppearance } from "@gcp/shared";
import {
  IconAlertTriangle,
  IconArrowUp,
  IconBuildingStore,
  IconDownload,
  IconHistory,
  IconReload,
  IconSettings,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CapabilityBadges } from "./capability-list";
import { InstallDialog } from "./install-dialog";
import { PluginAppearanceDialog } from "./plugin-appearance-dialog";
import { PluginConfigForm } from "./plugin-config-form";
import { ServerAppearanceDialog } from "./server-appearance-dialog";

function ConfigDialog({
  serverId,
  plugin,
}: {
  serverId: string;
  plugin: InstalledPlugin;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (!plugin.configSchema) return null;

  async function save(config: PluginConfig, cleared: string[]) {
    try {
      const { error } = await saveServerPluginConfig(
        serverId,
        plugin.pluginId,
        config,
        cleared,
      );
      if (error) throw new ServerError(error, "SavePluginConfigError");
      toast.success("Settings saved");
      router.refresh();
      return true;
    } catch (error) {
      toast.error("Failed to save the settings", {
        description: getErrorMessage(error),
      });
      return false;
    }
  }

  async function exportConfig() {
    try {
      const { data, error } = await exportServerPluginConfig(
        serverId,
        plugin.pluginId,
      );
      if (error) throw new ServerError(error, "ExportPluginConfigError");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `${plugin.slug}-config-${serverId}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to export plugin config", {
        description: getErrorMessage(error),
      });
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
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plugin.name} settings</DialogTitle>
          <DialogDescription>
            Applied right away, no restart needed.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <PluginConfigForm
            serverId={serverId}
            onExport={exportConfig}
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

function sourceLabel(plugin: { source: string }): string {
  return plugin.source === "marketplace" ? "Marketplace" : "Private";
}

function InstalledPluginCard({
  serverId,
  serverName,
  plugin,
  serverAppearance,
}: {
  serverId: string;
  serverName: string;
  plugin: InstalledPlugin;
  serverAppearance: ServerAppearance;
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
    note: v.yanked
      ? "withdrawn"
      : v.version === plugin.version
        ? "installed"
        : undefined,
  }));
  const switchVersion = (_: string, version: string, accepted: string[]) =>
    changeServerPluginVersion(serverId, plugin.pluginId, version, accepted);

  async function toggle(enabled: boolean) {
    setBusy(true);
    try {
      const { error } = await setServerPluginEnabled(
        serverId,
        plugin.pluginId,
        enabled,
      );
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
      toast.error(`Failed to uninstall ${plugin.name}`, {
        description: getErrorMessage(error),
      });
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
              {plugin.source === "marketplace" && !plugin.firstParty ? (
                <Link
                  href={generatePath(routes.plugins.detail, {
                    slug: plugin.slug,
                  })}
                  className="font-semibold hover:underline"
                >
                  {plugin.name}
                </Link>
              ) : (
                <span className="font-semibold">{plugin.name}</span>
              )}
              <Badge variant="outline">{plugin.version}</Badge>
              <Badge variant="secondary">{sourceLabel(plugin)}</Badge>
              {plugin.update && !plugin.yanked && (
                <Badge>Update: {plugin.update.version}</Badge>
              )}
            </div>
            {plugin.description && (
              <p className="text-sm text-muted-foreground">
                {plugin.description}
              </p>
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
          {plugin.capabilities.includes("ui") && (
            <PluginAppearanceDialog
              serverId={serverId}
              plugin={plugin}
              serverAppearance={serverAppearance}
            />
          )}
          {versions.length > 1 && (
            <InstallDialog
              name={plugin.name}
              targets={[target]}
              versions={versions}
              install={switchVersion}
              trigger={
                <Button
                  variant="outline"
                  collapse="sm"
                  title="Switch to another version"
                >
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
            {plugin.yankReason ? `: ${plugin.yankReason}` : ""}. It stays off
            until you install another version.
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
        confirmIcon={<IconTrash />}
        cancelText="Cancel"
      />
    </Card>
  );
}

function InstallAvailable({
  serverId,
  serverName,
  available,
}: {
  serverId: string;
  serverName: string;
  available: AvailablePlugin[];
}) {
  const [pluginId, setPluginId] = useState(available[0]?.pluginId ?? "");
  const plugin = available.find((p) => p.pluginId === pluginId) ?? available[0];

  function install(version: string, accepted: string[]) {
    if (plugin.source === "marketplace") {
      return installMarketplacePlugin(serverId, plugin.slug, version, accepted);
    }
    const id = plugin.versions.find((v) => v.version === version)?.id ?? "";
    return installUploadedPlugin(serverId, plugin.pluginId, id, accepted);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select value={plugin?.pluginId ?? ""} onValueChange={setPluginId}>
        <SelectTrigger className="sm:w-72" aria-label="Plugin to install">
          <SelectValue placeholder="Choose a plugin" />
        </SelectTrigger>
        <SelectContent>
          {available.map((option) => (
            <SelectItem key={option.pluginId} value={option.pluginId}>
              {option.name}
              <span className="text-muted-foreground">
                {" "}
                · {sourceLabel(option)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {plugin && (
        <InstallDialog
          key={plugin.pluginId}
          name={plugin.name}
          targets={[{ id: serverId, name: serverName, installedVersion: null }]}
          versions={plugin.versions.map((v) => ({
            version: v.version,
            capabilities: v.capabilities,
          }))}
          install={(_, version, accepted) => install(version, accepted)}
          trigger={
            <Button variant="outline">
              <IconDownload />
              Install
            </Button>
          }
        />
      )}
    </div>
  );
}

function ReloadButton({ serverId }: { serverId: string }) {
  const [busy, setBusy] = useState(false);

  async function reload() {
    setBusy(true);
    try {
      const { error } = await reloadServerPlugins(serverId);
      if (error) throw new ServerError(error, "ReloadServerPluginsError");
      toast.success("Plugins reloaded successfully");
    } catch (error) {
      toast.error("Failed to reload plugins", {
        description: getErrorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" onClick={reload} disabled={busy}>
      <IconReload />
      Reload plugins
    </Button>
  );
}

// Every plugin on one server: from the marketplace or uploaded
export default function InstalledPlugins({
  serverId,
  serverName,
  plugins,
  available,
  marketplaceEnabled,
  appearance,
}: {
  serverId: string;
  serverName: string;
  plugins: InstalledPlugin[];
  available: AvailablePlugin[];
  marketplaceEnabled: boolean;
  appearance: ServerAppearance;
}) {
  return (
    <section
      aria-labelledby="installed-plugins-title"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 id="installed-plugins-title" className="text-lg font-semibold">
            Plugins
          </h2>
          <p className="text-sm text-muted-foreground">
            They run in a sandbox with only the permissions you accepted. A
            plugin that misbehaves is turned off and the admins are notified.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReloadButton serverId={serverId} />
          <ServerAppearanceDialog serverId={serverId} appearance={appearance} />
          {marketplaceEnabled && (
            <Link
              href={routes.plugins.index}
              className={buttonVariants({ variant: "outline" })}
            >
              <IconBuildingStore />
              Browse marketplace
            </Link>
          )}
        </div>
      </div>

      {available.length > 0 && (
        <InstallAvailable
          serverId={serverId}
          serverName={serverName}
          available={available}
        />
      )}

      {plugins.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No plugins on this server yet.
        </p>
      ) : (
        plugins.map((plugin) => (
          <InstalledPluginCard
            key={plugin.pluginId}
            serverId={serverId}
            serverName={serverName}
            plugin={plugin}
            serverAppearance={appearance}
          />
        ))
      )}
    </section>
  );
}
