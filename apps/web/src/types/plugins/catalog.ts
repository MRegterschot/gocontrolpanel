import type { GameModeType, PluginConfig, PluginConfigSchema } from "@gcp/shared";

// What the plugin pages show; plain JSON so server components can hand it to client ones

export interface CatalogVersion {
  version: string;
  sdk: number;
  capabilities: string[];
  gamemodes: GameModeType[];
  commands: string[];
  publishedAt: string;
  changelog: string | null;
  yanked: boolean;
  yankReason: string | null;
  // This panel runs the plugin SDK the version needs
  compatible: boolean;
  size: number;
}

export interface CatalogPlugin {
  slug: string;
  name: string;
  description: string;
  author: string;
  tags: string[];
  icon: string | null;
  latest: CatalogVersion | null;
  // How many of the user's servers run it
  installedOn: number;
}

export interface ServerInstallState {
  id: string;
  name: string;
  installed: { version: string; enabled: boolean; source: PluginSourceKind } | null;
}

export interface CatalogPluginDetail extends CatalogPlugin {
  license: string | null;
  repository: string | null;
  homepage: string | null;
  readme: string | null;
  screenshots: string[];
  reportUrl: string | null;
  versions: CatalogVersion[];
  // plugins.id on this panel once any server installed it
  pluginId: string | null;
  // Servers the user administers
  servers: ServerInstallState[];
  // Another plugin on this panel already uses the slug
  conflict: string | null;
}

export interface Marketplace {
  enabled: boolean;
  name: string | null;
  repository: string | null;
  plugins: CatalogPlugin[];
  error: string | null;
}

export type PluginSourceKind = "marketplace" | "upload";

export interface VersionChoice {
  version: string;
  // Stored on this panel already, or downloaded from the marketplace when picked
  stored: boolean;
  capabilities: string[];
  yanked: boolean;
}

export interface InstalledPlugin {
  pluginId: string;
  slug: string;
  // Ships with GoControlPanel; configured with the panel's own forms
  firstParty: boolean;
  name: string;
  description: string | null;
  author: string | null;
  source: PluginSourceKind;
  version: string;
  enabled: boolean;
  yanked: boolean;
  yankReason: string | null;
  grantedCapabilities: string[];
  capabilities: string[];
  commands: string[];
  gamemodes: GameModeType[];
  configSchema: PluginConfigSchema | null;
  // Secrets are left out; setSecrets says which ones have a value
  config: PluginConfig;
  setSecrets: string[];
  update: VersionChoice | null;
  versions: VersionChoice[];
}

// A plugin stored on this panel that a server can install without the marketplace
export interface AvailablePlugin {
  pluginId: string;
  slug: string;
  name: string;
  description: string | null;
  source: PluginSourceKind;
  // Ships with GoControlPanel
  firstParty: boolean;
  // Newest first, withdrawn ones left out
  versions: { id: string; version: string; capabilities: string[] }[];
}

export interface UploadedVersion {
  id: string;
  version: string;
  sha256: string;
  size: number;
  capabilities: string[];
  createdAt: string;
  installs: number;
}

export interface UploadedPlugin {
  pluginId: string;
  slug: string;
  name: string;
  description: string | null;
  owner: string | null;
  versions: UploadedVersion[];
  installedOn: { serverId: string; serverName: string; version: string }[];
}

export interface UploadResult {
  pluginId: string;
  slug: string;
  name: string;
  version: string;
  capabilities: string[];
}
