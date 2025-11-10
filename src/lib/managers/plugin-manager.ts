import Plugin from "@/plugins";
import LiveRankingPlugin from "@/plugins/live-ranking";
import LiveRoundPlugin from "@/plugins/live-round";
import MapInfoPlugin from "@/plugins/map-info";
import RecordsInfoPlugin from "@/plugins/records-info";
import TAActiveRunsPlugin from "@/plugins/ta-active-runs";
import TALeaderboardPlugin from "@/plugins/ta-leaderboard";
import { appGlobals } from "../global";
import { GbxClientManager, getGbxClientManager } from "./gbxclient-manager";
import ManialinkManager, { getManialinkManager } from "./manialink-manager";

export default class PluginManager {
  private clientManager: GbxClientManager;
  private manialinkManager: ManialinkManager;
  private plugins: Map<string, Plugin> = new Map();

  constructor(clientManager: GbxClientManager, manialinkManager: ManialinkManager) {
    this.clientManager = clientManager;
    this.manialinkManager = manialinkManager;

    this.clientManager.addListeners("plugin-manager", {
      modeChange: this.onModeChange.bind(this),
    });
  }

  public async loadPlugins() {
    const pluginsToLoad: Plugin[] = [
      new TALeaderboardPlugin(this.clientManager, this.manialinkManager),
      new MapInfoPlugin(this.clientManager, this.manialinkManager),
      new RecordsInfoPlugin(this.clientManager, this.manialinkManager),
      new TAActiveRunsPlugin(this.clientManager, this.manialinkManager),
      new LiveRankingPlugin(this.clientManager, this.manialinkManager),
      new LiveRoundPlugin(this.clientManager, this.manialinkManager),
    ];

    for (const plugin of pluginsToLoad) {
      this.plugins.set(plugin.getPluginId(), plugin);
      if (
        plugin.getSupportedGamemodes().length > 0 &&
        !plugin
          .getSupportedGamemodes()
          .includes(this.clientManager.info.liveInfo.type)
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

export async function getPluginManager(
  serverId: string,
): Promise<PluginManager> {
  if (!appGlobals.pluginManagers?.[serverId]) {
    const clientManager = await getGbxClientManager(serverId);
    const manialinkManager = await getManialinkManager(serverId);
    appGlobals.pluginManagers = appGlobals.pluginManagers || {};
    appGlobals.pluginManagers[serverId] = new PluginManager(clientManager, manialinkManager);
  }

  if (!appGlobals.pluginManagers?.[serverId]) {
    throw new Error(`Plugin manager for server ${serverId} not found`);
  }

  return appGlobals.pluginManagers[serverId];
}
