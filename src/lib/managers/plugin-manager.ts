import Plugin from "@/plugins";
import LiveRankingPlugin from "@/plugins/live-ranking";
import LiveRoundPlugin from "@/plugins/live-round";
import MapInfoPlugin from "@/plugins/map-info";
import NotifyAdminPlugin from "@/plugins/notify-admin";
import RecordsInfoPlugin from "@/plugins/records-info";
import TAActiveRunsPlugin from "@/plugins/ta-active-runs";
import TALeaderboardPlugin from "@/plugins/ta-leaderboard";
import { GbxClientManager } from "./gbxclient-manager";
import ManialinkManager from "./manialink-manager";

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
    ];

    for (const plugin of pluginsToLoad) {
      this.plugins.set(plugin.getPluginId(), plugin);
    }
  }

  public async loadPlugins() {
    for (const plugin of this.plugins.values()) {
      if (
        (plugin.getSupportedGamemodes().length > 0 &&
          !plugin
            .getSupportedGamemodes()
            .includes(this.clientManager.info.liveInfo.type)) ||
        !plugin.getDefaultLoaded()
      ) {
        continue;
      }
      await plugin.onLoad();
      plugin.setLoaded(true);
    }
    await this.startPlugins();
  }

  public async unloadPlugins() {
    for (const plugin of this.plugins.values()) {
      await plugin.onUnload();
      plugin.setLoaded(false);
    }
    this.plugins.clear();
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

    if (!plugin.isLoaded()) {
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

  public reloadClientPlugins() {
    const clientPlugins = this.clientManager.info.plugins;

    if (
      clientPlugins.find((p) => p.plugin.name === "admin" && p.enabled) &&
      !this.isPluginLoaded("notify-admin")
    ) {
      this.loadPluginById("notify-admin");
    } else if (
      !clientPlugins.find((p) => p.plugin.name === "admin" && p.enabled) &&
      this.isPluginLoaded("notify-admin")
    ) {
      this.unloadPluginById("notify-admin");
    }
  }

  private isPluginLoaded(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    return plugin.isLoaded();
  }

  private async onModeChange(mode: string) {
    for (const plugin of this.plugins.values()) {
      if (plugin.getSupportedGamemodes().length <= 0) continue;

      if (plugin.getSupportedGamemodes().includes(mode) && !plugin.isLoaded()) {
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
