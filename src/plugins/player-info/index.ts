import { getPlayerRecords } from "@/actions/database/server-only/records";
import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import ManialinkManager from "@/lib/managers/manialink-manager";
import Widget from "@/lib/manialink/components/widget";
import { SMapInfo } from "@/types/gbx/map";
import { Waypoint } from "@/types/gbx/waypoint";
import { type PlayerInfo as TPlayerInfo } from "@/types/player";
import { PlayerInfoPluginConfig } from "@/types/plugins/player-info";
import Plugin from "..";

type PlayerInfo = {
  login: string;
  name: string;
  personalBest: number;
  device: string;
  camera: string;
};

export default class PlayerInfoPlugin extends Plugin<PlayerInfoPluginConfig | null> {
  static pluginId = "player-info";
  private widget: Widget;
  private playerInfos: { [key: string]: PlayerInfo } = {};

  constructor(
    clientManager: GbxClientManager,
    manialinkManager: ManialinkManager,
  ) {
    super(clientManager, manialinkManager);
    this.widget = new Widget(manialinkManager);
    this.widget.setTemplate("widgets/player-info/player-info");
    this.widget.setId("player-info-widget");
    this.widget.setPosition({ x: -156, y: -49 });
  }

  async onLoad() {
    this.clientManager.addListeners(this.getPluginId(), {
      beginMap: this.onBeginMap.bind(this),
      playerConnect: this.onPlayerConnect.bind(this),
      finish: this.onFinish.bind(this),
    });
  }

  async onUnload() {
    this.widget.destroy();
    this.clientManager.removeListeners(this.getPluginId());
  }

  async onStart() {
    this.widget.display();
    this.updatePlayerInfos();
  }

  async onConfigUpdate() {
    for (const playerInfo of Object.values(this.playerInfos)) {
      playerInfo.device = "Unknown";
      playerInfo.camera = "Unknown";
    }

    this.updatePlayerInfos();
  }

  async onFinish(finish: Waypoint) {
    const playerInfo = this.playerInfos[finish.login];
    if (!playerInfo) return;

    if (!playerInfo.personalBest || finish.racetime < playerInfo.personalBest) {
      playerInfo.personalBest = finish.racetime;
      this.updateWidget();
    }
  }

  async onBeginMap() {
    this.updatePlayerInfos();
  }

  async onPlayerConnect(playerInfo: TPlayerInfo) {
    if (this.playerInfos[playerInfo.login]) return;

    const map = this.clientManager.getActiveMap();

    let personalBest = 0;
    if (map) {
      const records = await getPlayerRecords(
        this.clientManager.getServerId(),
        map,
        [playerInfo.login],
      );
      const record = records.find((r) => r.login === playerInfo.login);
      personalBest = record ? record.time : 0;
    }

    const playerConfig = this.config?.playerInfos?.find(
      (pi) => pi.login === playerInfo.login,
    );

    this.playerInfos[playerInfo.login] = {
      login: playerInfo.login,
      name: playerInfo.nickName,
      personalBest,
      device: playerConfig?.device || "Unknown",
      camera: playerConfig?.camera || "Unknown",
    };

    this.updateWidget();
  }

  async updatePlayerInfos() {
    const map: SMapInfo =
      await this.clientManager.client.call("GetCurrentMapInfo");

    const players = this.clientManager.info.activePlayers.map((p) => p.login);

    if (players.length === 0) {
      this.playerInfos = {};
      this.updateWidget();
      return;
    }

    const records = await getPlayerRecords(
      this.clientManager.getServerId(),
      map.UId,
      players,
    );

    this.playerInfos = {};

    for (const player of this.clientManager.info.activePlayers) {
      const record = records.find((r) => r.login === player.login);
      const playerInfo = this.config?.playerInfos?.find(
        (pi) => pi.login === player.login,
      );
      this.playerInfos[player.login] = {
        login: player.login,
        name: player.nickName,
        personalBest: record ? record.time : 0,
        device: playerInfo?.device || "Unknown",
        camera: playerInfo?.camera || "Unknown",
      };
    }

    this.updateWidget();
  }

  updateWidget() {
    this.widget.setData({
      playerInfosJson: JSON.stringify(Object.values(this.playerInfos)),
    });
    this.widget.update();
  }
}
