import Plugin from "@/plugins";
import TALeaderboardPlugin from "@/plugins/ta-leaderboard";
import { GbxClientManager } from "./gbxclient-manager";
import MapInfoPlugin from "@/plugins/map-info";
import RecordsInfoPlugin from "@/plugins/records-info";
import TAActiveRunsPlugin from "@/plugins/ta-active-runs";
import LiveRankingPlugin from "@/plugins/live-ranking";
import LiveRoundPlugin from "@/plugins/live-round";

export default class PluginManager {
  private clientManager: GbxClientManager;
  private plugins: Map<string, Plugin> = new Map();

  constructor(clientManager: GbxClientManager) {
    this.clientManager = clientManager;

    this.clientManager.addListeners("plugin-manager", {
      modeChange: this.onModeChange.bind(this),
    });
  }

  public async loadPlugins() {
    const pluginsToLoad: Plugin[] = [
      new TALeaderboardPlugin(this.clientManager),
      new MapInfoPlugin(this.clientManager),
      new RecordsInfoPlugin(this.clientManager),
      new TAActiveRunsPlugin(this.clientManager),
      new LiveRankingPlugin(this.clientManager),
      new LiveRoundPlugin(this.clientManager),
    ];

    for (const plugin of pluginsToLoad) {
      this.plugins.set(plugin.getPluginId(), plugin);
      if (
        plugin.getSupportedGamemodes().length > 0 &&
        !plugin.getSupportedGamemodes().includes(this.clientManager.info.liveInfo.type)
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
