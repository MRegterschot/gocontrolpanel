import Plugin from "@/plugins";
import TALeaderboardPlugin from "@/plugins/ta-leaderboard";
import { GbxClientManager } from "./gbxclient-manager";

export default class PluginManager {
  private clientManager: GbxClientManager;
  private plugins: Map<string, Plugin> = new Map();

  constructor(clientManager: GbxClientManager) {
    this.clientManager = clientManager;
  }

  public async loadPlugins() {
    const pluginsToLoad: Plugin[] = [
      new TALeaderboardPlugin(this.clientManager),
    ];

    for (const plugin of pluginsToLoad) {
      await plugin.onLoad();
      this.plugins.set(plugin.getPluginId(), plugin);
    }

    await this.startPlugins();
  }

  public async unloadPlugins() {
    for (const plugin of this.plugins.values()) {
      await plugin.onUnload();
    }
    this.plugins.clear();
  }

  public async startPlugins() {
    for (const plugin of this.plugins.values()) {
      await plugin.onStart();
    }
  }
}
