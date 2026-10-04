"use client";

import { changeServerPluginVersion, installMarketplacePlugin } from "@/actions/plugins";
import { Button } from "@/components/ui/button";
import type { CatalogPluginDetail } from "@/types/plugins/catalog";
import { IconDownload } from "@tabler/icons-react";
import { InstallDialog } from "./install-dialog";

export function MarketplaceInstallButton({ plugin }: { plugin: CatalogPluginDetail }) {
  const targets = plugin.servers.map((server) => ({
    id: server.id,
    name: server.name,
    installedVersion:
      server.installed?.source === "marketplace" ? server.installed.version : null,
    blocked:
      plugin.conflict ??
      (server.installed && server.installed.source !== "marketplace"
        ? "another plugin with this name"
        : null),
  }));

  const versions = plugin.versions.map((version) => ({
    version: version.version,
    capabilities: version.capabilities,
    disabled: version.yanked || !version.compatible,
    note: version.yanked
      ? "withdrawn"
      : !version.compatible
        ? "needs a newer panel"
        : version.version === plugin.latest?.version
          ? "latest"
          : undefined,
  }));

  return (
    <InstallDialog
      name={plugin.name}
      targets={targets}
      versions={versions}
      defaultVersion={plugin.latest?.version}
      install={(serverId, version, accepted) => {
        const installed = targets.find((t) => t.id === serverId)?.installedVersion;
        return installed && plugin.pluginId
          ? changeServerPluginVersion(serverId, plugin.pluginId, version, accepted)
          : installMarketplacePlugin(serverId, plugin.slug, version, accepted);
      }}
      trigger={
        <Button disabled={!plugin.latest || !!plugin.conflict}>
          <IconDownload />
          Install
        </Button>
      }
    />
  );
}
