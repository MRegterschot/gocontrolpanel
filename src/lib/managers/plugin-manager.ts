import Plugin from "@/plugins";
import ECMPlugin from "@/plugins/ecm";
import LiveRankingPlugin from "@/plugins/live-ranking";
import LiveRoundPlugin from "@/plugins/live-round";
import MapInfoPlugin from "@/plugins/map-info";
import NotifyAdminPlugin from "@/plugins/notify-admin";
import RecordsInfoPlugin from "@/plugins/records-info";
import TAActiveRunsPlugin from "@/plugins/ta-active-runs";
import TALeaderboardPlugin from "@/plugins/ta-leaderboard";
import { GbxClientManager } from "./gbxclient-manager";
import ManialinkManager from "./manialink-manager";
import PlayerInfoPlugin from "@/plugins/player-info";

export default class PluginManager {
  private clientManager: GbxClientManager;
  private manialinkManager: ManialinkManager;
  private plugins: Map<string, Plugin> = new Map();

  constructor(clientManager: GbxClientManager) {
    this.clientManager = clientManager;
    this.manialinkManager = new ManialinkManager(this.clientManager);

    this.clientManager.addListeners("plugin-manager", {
      modeChange: this.onModeChange.bind(this),
    });

    const pluginsToLoad: Plugin[] = [
      new TALeaderboardPlugin(this.clientManager, this.manialinkManager),
      new MapInfoPlugin(this.clientManager, this.manialinkManager),
      new RecordsInfoPlugin(this.clientManager, this.manialinkManager),
      new TAActiveRunsPlugin(this.clientManager, this.manialinkManager),
      new LiveRankingPlugin(this.clientManager, this.manialinkManager),
      new LiveRoundPlugin(this.clientManager, this.manialinkManager),
      new NotifyAdminPlugin(this.clientManager, this.manialinkManager),
      new ECMPlugin(this.clientManager, this.manialinkManager),
      new PlayerInfoPlugin(this.clientManager, this.manialinkManager),
    ];

    for (const plugin of pluginsToLoad) {
      this.plugins.set(plugin.getPluginId(), plugin);
    }
  }

  public async loadPlugins() {
    const clientPlugins = this.clientManager.info.plugins;

    for (const plugin of this.plugins.values()) {
      // Check if plugin is enabled
      const clientPlugin = clientPlugins.find(
        (p) => p.plugin.name === plugin.getPluginId(),
      );

      if (!clientPlugin) continue;

      plugin.setDbPluginId(clientPlugin.plugin.id);

      // Check if plugin supports current gamemode
      if (
        plugin.getSupportedGamemodes().length > 0 &&
        !plugin
          .getSupportedGamemodes()
          .includes(this.clientManager.info.liveInfo.type)
      ) {
        continue;
      }

      // Check if plugin is already loaded
      if (plugin.isLoaded()) continue;

      if (!clientPlugin.enabled) continue;

      plugin.setConfig(clientPlugin.config);
      await plugin.onLoad();
      plugin.setLoaded(true);
    }
    await this.startPlugins();
  }

  public async unloadPlugins() {
    for (const plugin of this.plugins.values()) {
      if (!plugin.isLoaded()) continue;
      await plugin.onUnload();
      plugin.setLoaded(false);
    }
  }

  public async startPlugins() {
    for (const plugin of this.plugins.values()) {
      if (!plugin.isLoaded()) continue;
      await plugin.onStart();
    }
  }

  public async loadPluginById(pluginId: string) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    const clientPlugin = this.clientManager.info.plugins.find(
      (p) => p.plugin.name === pluginId,
    );

    if (!plugin.isLoaded()) {
      plugin.setConfig(clientPlugin?.config || null);
      plugin.setDbPluginId(clientPlugin?.plugin.id || "");
      await plugin.onLoad();
      plugin.setLoaded(true);
    }
    await plugin.onStart();
  }

  public async unloadPluginById(pluginId: string) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    if (plugin.isLoaded()) {
      await plugin.onUnload();
      plugin.setLoaded(false);
    }
  }

  public async reloadPlugins(updateConfigs: boolean = true) {
    const clientPlugins = this.clientManager.info.plugins;

    for (const plugin of this.plugins.values()) {
      const clientPlugin = clientPlugins.find(
        (p) => p.plugin.name === plugin.getPluginId(),
      );

      // Determine if plugin should be loaded
      const shouldBeLoaded =
        clientPlugin &&
        clientPlugin.enabled &&
        (plugin.getSupportedGamemodes().length === 0 ||
          plugin
            .getSupportedGamemodes()
            .includes(this.clientManager.info.liveInfo.type));

      // If plugin should be loaded but isn't, load it
      if (shouldBeLoaded && !plugin.isLoaded()) {
        plugin.setConfig(clientPlugin.config);
        plugin.setDbPluginId(clientPlugin.plugin.id);
        await plugin.onLoad();
        plugin.setLoaded(true);
        await plugin.onStart();

        // If plugin shouldn't be loaded but is, unload it
      } else if (!shouldBeLoaded && plugin.isLoaded()) {
        await plugin.onUnload();
        plugin.setLoaded(false);
      }

      // If plugin is loaded and config has changed, update it
      else if (shouldBeLoaded && plugin.isLoaded() && updateConfigs) {
        plugin.setConfig(clientPlugin.config);
        plugin.setDbPluginId(clientPlugin.plugin.id);
      }
    }
  }

  private async onModeChange(mode: string) {
    const clientPlugins = this.clientManager.info.plugins;

    for (const plugin of this.plugins.values()) {
      const clientPlugin = clientPlugins.find(
        (p) => p.plugin.name === plugin.getPluginId(),
      );

      // Skip if plugin is not enabled
      if (!clientPlugin || !clientPlugin.enabled) {
        if (plugin.isLoaded()) {
          await plugin.onUnload();
          plugin.setLoaded(false);
        }
        continue;
      }

      if (plugin.getSupportedGamemodes().length <= 0) continue;

      if (plugin.getSupportedGamemodes().includes(mode) && !plugin.isLoaded()) {
        plugin.setConfig(clientPlugin.config);
        plugin.setDbPluginId(clientPlugin.plugin.id);
        await plugin.onLoad();
        plugin.setLoaded(true);
        await plugin.onStart();
        continue;
      }

      if (!plugin.getSupportedGamemodes().includes(mode) && plugin.isLoaded()) {
        await plugin.onUnload();
        plugin.setLoaded(false);
      }
    }
  }
}
