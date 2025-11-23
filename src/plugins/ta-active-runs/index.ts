import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import ManialinkManager from "@/lib/managers/manialink-manager";
import Widget from "@/lib/manialink/components/widget";
import { getSpectatorStatus } from "@/lib/utils";
import { SPlayerInfo } from "@/types/gbx/player";
import { Waypoint, WaypointEvent } from "@/types/gbx/waypoint";
import { PlayerInfo } from "@/types/player";
import Plugin from "..";

type ActiveRun = {
  login: string;
  name: string;
  time: number;
  checkpoint: number;
};

export default class TAActiveRunsPlugin extends Plugin {
  static pluginId = "ta-active-runs";
  static gamemodes = ["timeattack"];
  private widget: Widget;

  private activeRuns: ActiveRun[] = [];

  constructor(
    clientManager: GbxClientManager,
    manialinkManager: ManialinkManager,
  ) {
    super(clientManager, manialinkManager);
    this.widget = new Widget(manialinkManager);
    this.widget.setTemplate("widgets/ta-active-runs/ta-active-runs");
    this.widget.setId("ta-active-runs-widget");
    this.widget.setPosition({ x: -156, y: 73.5 });
  }

  async onLoad() {
    this.clientManager.addListeners(this.getPluginId(), {
      beginMap: this.onBeginMap.bind(this),
      playerConnect: this.onPlayerConnect.bind(this),
      playerInfo: this.onPlayerInfo.bind(this),
      playerDisconnect: this.onPlayerDisconnect.bind(this),
      startLine: this.onStartLine.bind(this),
      checkpoint: this.onCheckpoint.bind(this),
      finish: this.onFinish.bind(this),
      giveUp: this.onGiveUp.bind(this),
      skipOutro: this.onSkipOutro.bind(this),
    });
  }

  async onUnload() {
    this.widget.destroy();
    this.clientManager.removeListeners(this.getPluginId());
  }

  async onStart() {
    this.widget.display();
    this.clearActiveRuns();
  }

  async onBeginMap() {
    this.clearActiveRuns();
  }

  async onPlayerConnect(playerInfo: PlayerInfo) {
    if (
      getSpectatorStatus(playerInfo.spectatorStatus).spectator ||
      this.activeRuns.find((r) => r.login === playerInfo.login)
    )
      return;

    this.activeRuns.push({
      login: playerInfo.login,
      name: playerInfo.nickName,
      time: 0,
      checkpoint: 0,
    });

    await this.updateWidget();
  }

  async onPlayerDisconnect(login: string) {
    const activeRun = this.activeRuns.find((run) => run.login === login);
    if (!activeRun) return;

    this.activeRuns = this.activeRuns.filter((run) => run.login !== login);
    await this.updateWidget();
  }

  async onPlayerInfo(playerInfo: PlayerInfo) {
    if (getSpectatorStatus(playerInfo.spectatorStatus).spectator) {
      this.activeRuns = this.activeRuns.filter(
        (run) => run.login !== playerInfo.login,
      );
    } else {
      const existingRun = this.activeRuns.find(
        (run) => run.login === playerInfo.login,
      );

      if (!existingRun) {
        this.activeRuns.push({
          login: playerInfo.login,
          name: playerInfo.nickName,
          time: 0,
          checkpoint: 0,
        });
      } else {
        for (let i = 0; i < this.activeRuns.length; i++) {
          if (this.activeRuns[i].login === playerInfo.login) {
            this.activeRuns[i].time = 0;
            this.activeRuns[i].checkpoint = 0;
            break;
          }
        }
      }
    }

    await this.updateWidget();
  }

  async onStartLine(startLine: WaypointEvent) {
    for (let i = 0; i < this.activeRuns.length; i++) {
      if (this.activeRuns[i].login === startLine.login) {
        this.activeRuns[i].time = 0;
        this.activeRuns[i].checkpoint = 0;

        await this.updateWidget();
        return;
      }
    }
  }

  async onCheckpoint(checkpoint: Waypoint) {
    for (let i = 0; i < this.activeRuns.length; i++) {
      if (this.activeRuns[i].login === checkpoint.login) {
        this.activeRuns[i].time = checkpoint.racetime;
        this.activeRuns[i].checkpoint = checkpoint.checkpointinrace + 1;

        await this.updateWidget();
        return;
      }
    }
  }

  async onFinish(finish: Waypoint) {
    for (let i = 0; i < this.activeRuns.length; i++) {
      if (this.activeRuns[i].login === finish.login) {
        this.activeRuns[i].time = finish.racetime;
        this.activeRuns[i].checkpoint = -69; // Finished

        await this.updateWidget();
        return;
      }
    }
  }

  async onGiveUp(giveUp: WaypointEvent) {
    for (let i = 0; i < this.activeRuns.length; i++) {
      if (this.activeRuns[i].login === giveUp.login) {
        this.activeRuns[i].time = 0;
        this.activeRuns[i].checkpoint = 0;

        await this.updateWidget();
        return;
      }
    }
  }

  async onSkipOutro(skipOutro: WaypointEvent) {
    for (let i = 0; i < this.activeRuns.length; i++) {
      if (this.activeRuns[i].login === skipOutro.login) {
        this.activeRuns[i].time = 0;
        this.activeRuns[i].checkpoint = 0;

        await this.updateWidget();
        return;
      }
    }
  }

  async clearActiveRuns() {
    const playerList: SPlayerInfo[] = await this.clientManager.client.call(
      "GetPlayerList",
      1000,
      0,
    );

    const mainServerInfo = await this.clientManager.client.call(
      "GetMainServerPlayerInfo",
    );

    this.activeRuns = [];
    if (playerList && Array.isArray(playerList)) {
      for (let i = 0; i < playerList.length; i++) {
        const player = playerList[i];
        if (!player.Login || player.Login === mainServerInfo.Login) {
          continue; // Skip the main server player
        }

        if (getSpectatorStatus(player.SpectatorStatus).spectator) {
          continue; // Skip spectators
        }

        this.activeRuns.push({
          login: player.Login,
          name: player.NickName,
          time: 0,
          checkpoint: 0,
        });
      }
    }

    await this.updateWidget();
  }

  async updateWidget() {
    this.activeRuns.sort((a, b) => {
      // Sort by checkpoint (higher is better except -69 which means finished)
      if (a.checkpoint === -69 && b.checkpoint !== -69) return 1;
      if (b.checkpoint === -69 && a.checkpoint !== -69) return -1;
      if (a.checkpoint !== b.checkpoint) return b.checkpoint - a.checkpoint;

      // If checkpoints are equal, sort by time (lower is better)
      return a.time - b.time;
    });

    this.widget.setData({ activeRunsJson: JSON.stringify(this.activeRuns) });
    this.widget.update();
  }
}
