import { getPlayerRecords } from "@/actions/database/server-only/records";
import { getMapRecordsByAccounts } from "@/lib/api/nadeo";
import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import ManialinkManager from "@/lib/managers/manialink-manager";
import Widget from "@/lib/manialink/components/widget";
import { SMapInfo } from "@/types/gbx/map";
import { Waypoint } from "@/types/gbx/waypoint";
import { type PlayerInfo as TPlayerInfo } from "@/types/player";
import { PlayerInfoPluginConfig } from "@/types/plugins/player-info";
import slugid from "slugid";
import Plugin from "..";

type PlayerInfo = {
  login: string;
  name: string;
  personalBest: number;
  localRecord: number;
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
      const configInfo = this.config?.playerInfos?.find(
        (pi) => pi.login === playerInfo.login,
      );

      playerInfo.device = configInfo?.device || "Unknown";
      playerInfo.camera = configInfo?.camera || "Unknown";
    }

    this.updateWidget();
  }

  async onFinish(finish: Waypoint) {
    const playerInfo = this.playerInfos[finish.login];
    if (!playerInfo) return;

    // Update local record and/or personal best if beaten and update widget only if needed
    let updated = false;
    if (!playerInfo.personalBest || finish.racetime < playerInfo.personalBest) {
      playerInfo.personalBest = finish.racetime;
      updated = true;
    }

    if (!playerInfo.localRecord || finish.racetime < playerInfo.localRecord) {
      playerInfo.localRecord = finish.racetime;
      updated = true;
    }

    if (updated) {
      this.updateWidget();
    }
  }

  async onBeginMap() {
    this.updatePlayerInfos();
  }

  async onPlayerConnect(playerInfo: TPlayerInfo) {
    if (this.playerInfos[playerInfo.login]) return;

    const map = this.clientManager.getActiveMap();

    let localRecord = 0;
    try {
      if (map) {
        const records = await getPlayerRecords(
          this.clientManager.getServerId(),
          map,
          [playerInfo.login],
        );
        const record = records.find((r) => r.login === playerInfo.login);
        localRecord = record ? record.time : 0;
      }
    } catch (error) {
      console.error("Error fetching player records:", error);
    }

    let personalBest = 0;
    try {
      if (map) {
        const personalBests = await getMapRecordsByAccounts(map, [
          slugid.decode(playerInfo.login),
        ]);
        const pbRecord = personalBests.find(
          (r) => r.accountId === slugid.decode(playerInfo.login),
        );
        personalBest = pbRecord ? pbRecord.recordScore.time : 0;
      }
    } catch (error) {
      console.error("Error fetching personal best:", error);
    }

    const playerConfig = this.config?.playerInfos?.find(
      (pi) => pi.login === playerInfo.login,
    );

    this.playerInfos[playerInfo.login] = {
      login: playerInfo.login,
      name: playerInfo.nickName,
      personalBest,
      localRecord,
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

    let localRecords: Awaited<ReturnType<typeof getPlayerRecords>> = [];
    try {
      localRecords = await getPlayerRecords(
        this.clientManager.getServerId(),
        map.UId,
        players,
      );
    } catch (error) {
      console.error("Error fetching player records:", error);
    }

    let personalBests: Awaited<ReturnType<typeof getMapRecordsByAccounts>> = [];
    try {
      personalBests = await getMapRecordsByAccounts(
        map.UId,
        players
          .filter((p) => !p.includes("fakeplayer"))
          .map((p) => slugid.decode(p)),
      );
    } catch (error) {
      console.error("Error fetching personal bests:", error);
    }

    this.playerInfos = {};

    for (const player of this.clientManager.info.activePlayers) {
      if (player.login.includes("fakeplayer")) continue;
      const localRecord = localRecords.find((r) => r.login === player.login);
      const personalBest = personalBests.find(
        (r) => r.accountId === slugid.decode(player.login),
      );
      const playerInfo = this.config?.playerInfos?.find(
        (pi) => pi.login === player.login,
      );
      this.playerInfos[player.login] = {
        login: player.login,
        name: player.nickName,
        personalBest: personalBest ? personalBest.recordScore.time : 0,
        localRecord: localRecord ? localRecord.time : 0,
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
