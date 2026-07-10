import { getPlayerInfo } from "@/actions/gbx/server-only";
import { pauseMatch, setScriptName } from "@/actions/gbx/server-only/game";
import {
  getMapsInfo,
  jumpToMapIndex,
  restartMap,
  setMapList,
} from "@/actions/gbx/server-only/maps";
import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import ManialinkManager from "@/lib/managers/manialink-manager";
import Widget from "@/lib/manialink/components/widget";
import { PlayerManialinkPageAnswer } from "@/types/gbx/player";
import { MatchPluginConfig } from "@/types/plugins/match";
import Plugin from "..";

export type MatchState =
  | "not_started"
  | "pickban"
  | "in_progress"
  | "paused"
  | "ended";

type MapInfo = {
  name: string;
  author: string;
  uid: string;
  order: number;
  pickedBy: string;
  bannedBy: string;
};

export default class MatchPlugin extends Plugin<MatchPluginConfig | null> {
  static pluginId = "match";
  private widget: Widget;

  private matchState: MatchState = "not_started";
  private pickBanMaps: MapInfo[] = [];

  constructor(
    clientManager: GbxClientManager,
    manialinkManager: ManialinkManager,
  ) {
    super(clientManager, manialinkManager);
    this.widget = new Widget(manialinkManager);
    this.widget.setTemplate("widgets/match/pickban");
    this.widget.setId("match-pickban-widget");
    this.widget.setPosition({ x: -60, y: 67 });
    this.widget.setData({
      pickBanAction: "match-pickban-action",
    });
  }

  async onLoad() {
    this.clientManager.addListeners(this.getPluginId(), {});

    this.clientManager.onCommand(
      "matchstart",
      this.onMatchStartCommand.bind(this),
    );
    this.clientManager.onCommand(
      "matchstop",
      this.onMatchStopCommand.bind(this),
    );
    this.clientManager.onCommand("pause", this.onPauseCommand.bind(this));
    this.clientManager.onCommand("unpause", this.onUnpauseCommand.bind(this));
    this.clientManager.onCommand("pickban", this.onPickbanCommand.bind(this));

    this.clientManager.onAction(
      "match-pickban-action-{uid}",
      this.onMatchAction,
    );
  }

  async onUnload() {
    this.clientManager.removeListeners(this.getPluginId());

    this.clientManager.offCommand(
      "matchstart",
      this.onMatchStartCommand.bind(this),
    );
    this.clientManager.offCommand(
      "matchstop",
      this.onMatchStopCommand.bind(this),
    );
    this.clientManager.offCommand("pause", this.onPauseCommand.bind(this));
    this.clientManager.offCommand("unpause", this.onUnpauseCommand.bind(this));
    this.clientManager.offCommand("pickban", this.onPickbanCommand.bind(this));

    this.clientManager.offAction(
      "match-pickban-action-{uid}",
      this.onMatchAction,
    );
  }

  async onStart() {
    this.widget.display();
  }

  async onConfigUpdate() {
    const mapsInfo = await getMapsInfo(
      this.clientManager.getServerId(),
      this.config?.maps || [],
    );

    this.pickBanMaps = mapsInfo.map((map) => ({
      name: map.Name,
      author: map.Author,
      uid: map.UId,
      order: 0,
      pickedBy: "",
      bannedBy: "",
    }));

    this.updateMatchInfo();
  }

  onMatchAction = async (
    data: PlayerManialinkPageAnswer,
    params: Record<string, string>,
  ) => {
    const uid = params["uid"];
    if (!uid) return;

    let player = this.clientManager.info.activePlayers.find(
      (p) => p.login === data.Login,
    );

    if (!player) {
      player = await getPlayerInfo(this.clientManager.client, data.Login);
    }

    this.pickBanMaps = this.pickBanMaps.map((map) => {
      if (map.uid == uid) {
        map.order = 1;
        map.pickedBy = player?.nickName || data.Login;
      }
      return map;
    });

    this.updateMatchInfo();
  };

  async onMatchStartCommand(_: string[], login: string) {
    if (this.config?.script) {
      try {
        await setScriptName(
          this.clientManager.getServerId(),
          this.config.script,
        );
      } catch (error) {
        console.error("Error loading match script:", error);
        this.clientManager.client.call(
          "ChatSendServerMessageToLogin",
          `Failed to load match script: ${error}`,
          login,
        );
        return;
      }
    }

    if (this.config?.maps && this.config.maps.length > 0) {
      try {
        await setMapList(this.clientManager.getServerId(), this.config.maps);
      } catch (error) {
        console.error("Error setting map list:", error);
        this.clientManager.client.call(
          "ChatSendServerMessageToLogin",
          `Failed to set map list: ${error}`,
          login,
        );
        return;
      }
    }

    this.clientManager.client.call(
      "ChatSendServerMessage",
      "Loaded match configuration, starting match...",
    );

    try {
      await jumpToMapIndex(this.clientManager.getServerId(), 0);
      this.matchState = "in_progress";
    } catch {
      try {
        await restartMap(this.clientManager.getServerId());
        this.matchState = "in_progress";
      } catch (restartError) {
        console.error("Error starting match:", restartError);
        this.clientManager.client.call(
          "ChatSendServerMessageToLogin",
          `Failed to start the match: ${restartError}`,
          login,
        );
      }
    }
  }

  async onMatchStopCommand(_: string[], login: string) {
    this.matchState = "ended";
  }

  async onPauseCommand(_: string[], login: string) {
    if (!this.clientManager.info.liveInfo.pauseAvailable) {
      this.clientManager.client.call(
        "ChatSendServerMessageToLogin",
        `Pausing is not available in this mode`,
        login,
      );
      return;
    }

    if (this.clientManager.info.liveInfo.isPaused) {
      this.clientManager.client.call(
        "ChatSendServerMessageToLogin",
        `Match is already paused`,
        login,
      );
      return;
    }

    try {
      const player = this.clientManager.info.activePlayers.find(
        (p) => p.login === login,
      );

      await pauseMatch(this.clientManager.getServerId(), true);
      this.matchState = "paused";
      this.clientManager.client.call(
        "ChatSendServerMessage",
        `Match paused by ${player?.nickName || login}`,
      );
    } catch (error) {
      console.error("Error pausing match:", error);
      this.clientManager.client.call(
        "ChatSendServerMessageToLogin",
        `Failed to pause the match: ${error}`,
        login,
      );
    }
  }

  async onUnpauseCommand(_: string[], login: string) {
    if (!this.clientManager.info.liveInfo.pauseAvailable) {
      this.clientManager.client.call(
        "ChatSendServerMessageToLogin",
        `Pausing is not available in this mode`,
        login,
      );
      return;
    }

    if (!this.clientManager.info.liveInfo.isPaused) {
      this.clientManager.client.call(
        "ChatSendServerMessageToLogin",
        `Match is not paused`,
        login,
      );
      return;
    }

    try {
      const player = this.clientManager.info.activePlayers.find(
        (p) => p.login === login,
      );

      await pauseMatch(this.clientManager.getServerId(), false);
      this.matchState = "in_progress";
      this.clientManager.client.call(
        "ChatSendServerMessage",
        `Match unpaused by ${player?.nickName || login}`,
      );
    } catch (error) {
      console.error("Error unpausing match:", error);
      this.clientManager.client.call(
        "ChatSendServerMessageToLogin",
        `Failed to unpause the match: ${error}`,
        login,
      );
    }
  }

  async onPickbanCommand(_: string[], login: string) {}

  private updateMatchInfo() {
    this.widget.setData({
      mapInfosJson: JSON.stringify(this.pickBanMaps),
    });
    this.widget.update();
  }
}
