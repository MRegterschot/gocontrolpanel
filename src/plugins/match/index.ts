import { pauseMatch, setScriptName } from "@/actions/gbx/server-only/game";
import {
  getMapList,
  getMapsInfo,
  jumpToMapIndex,
  restartMap,
  setMapList,
} from "@/actions/gbx/server-only/maps";
import { MatchPluginPickAndBanOrder } from "@/forms/server/plugins/match/match-schema";
import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import ManialinkManager from "@/lib/managers/manialink-manager";
import Widget from "@/lib/manialink/components/widget";
import { sleep, stringToPickAndBan } from "@/lib/utils";
import { PlayerManialinkPageAnswer } from "@/types/gbx/player";
import { MatchPluginConfig } from "@/types/plugins/match";
import Plugin from "..";

export type MatchState = "not_started" | "pickban" | "ready" | "in_progress";

type PickBanAction = {
  action: "pick" | "ban" | "random";
  login: string;
  players: string[];
  nickName: string;
};

type PickBanState = {
  type: "player" | "team";
  order: MatchPluginPickAndBanOrder;
  players?: {
    login: string;
    seed: number;
  }[];
  teams?: {
    seed: number;
    players: string[];
  }[];
  maps: MapInfo[];
  currentIndex: number;
  currentAction: PickBanAction | null;
  pickedMaps: string[];
};

type MapInfo = {
  name: string;
  author: string;
  uid: string;
  filename: string;
  index: number;
  selectedBy: string[];
  pickedBy: string;
  bannedBy: string;
};

export default class MatchPlugin extends Plugin<MatchPluginConfig | null> {
  static pluginId = "match";
  static helpText = 
`With this plugin you can easily manage matches, including pick and ban phases, pausing, and unpausing.
Commands: 
/matchstart - Starts the match
/matchstop - Stops the match
/pause - Pauses the match
/unpause - Unpauses the match
/pickban - Starts the pick and ban phase
/lobby - Sets the server to lobby state
`;
  private widget: Widget;

  private matchState: MatchState = "not_started";
  private pickBanState: PickBanState = {
    type: "player",
    order: [],
    players: [],
    maps: [],
    currentIndex: 0,
    currentAction: null,
    pickedMaps: [],
  };

  constructor(
    clientManager: GbxClientManager,
    manialinkManager: ManialinkManager,
  ) {
    super(clientManager, manialinkManager);
    this.widget = new Widget(manialinkManager);
    this.widget.setTemplate("widgets/match/pickban");
    this.widget.setId("match-pickban-widget");
    this.widget.setPosition({ x: -60, y: 67 });
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
    this.clientManager.onCommand("lobby", this.onLobbyCommand.bind(this));

    this.clientManager.onAction(
      "match-pickban-action-{uid}",
      this.onMatchAction,
    );
  }

  async onUnload() {
    this.widget.destroy();

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
    this.clientManager.offCommand("lobby", this.onLobbyCommand.bind(this));

    this.clientManager.offAction(
      "match-pickban-action-{uid}",
      this.onMatchAction,
    );
  }

  async onStart() {}

  onMatchAction = async (
    data: PlayerManialinkPageAnswer,
    params: Record<string, string>,
  ) => {
    const uid = params["uid"];
    if (!uid) return;

    if (!this.pickBanState.currentAction) {
      this.clientManager.client.call(
        "ChatSendServerMessageToLogin",
        `No pick and ban action is currently active`,
        data.Login,
      );
      return;
    }

    if (
      this.pickBanState.type === "player" &&
      this.pickBanState.currentAction.login !== data.Login
    )
      return;

    if (
      this.pickBanState.type === "team" &&
      !this.pickBanState.currentAction.players.includes(data.Login)
    )
      return;

    const map = this.pickBanState.maps.find((map) => map.uid === uid);
    if (!map) {
      this.clientManager.client.call(
        "ChatSendServerMessageToLogin",
        `Selected map not found`,
        data.Login,
      );
      return;
    }

    if (this.pickBanState.type === "player") {
      if (this.pickBanState.currentAction.action === "pick") {
        this.pickBanState.pickedMaps.push(map.filename);

        map.pickedBy = this.pickBanState.currentAction.nickName;
        map.index = this.pickBanState.pickedMaps.length;
      } else if (this.pickBanState.currentAction.action === "ban") {
        map.bannedBy = this.pickBanState.currentAction.nickName;
      }

      this.pickBanState.currentAction = this.getNextPickBanAction();
      this.updatePickBan();
    } else if (this.pickBanState.type === "team") {
      // Add the player's login to the selectedBy array for the map
      if (!map.selectedBy.includes(data.Login)) {
        map.selectedBy.push(data.Login);
      }

      // Remove the player's login from any other maps' selectedBy arrays that are not picked or banned
      this.pickBanState.maps.forEach((m) => {
        if (m.uid !== map.uid && !m.pickedBy && !m.bannedBy) {
          m.selectedBy = m.selectedBy.filter((login) => login !== data.Login);
        }
      });

      // Check if more than half of the active players on the team have selected the same map
      const teamPlayers = this.pickBanState.currentAction.players;
      const selectedCount = map.selectedBy.filter((login) =>
        teamPlayers.includes(login),
      ).length;
      const activeTeamPlayers = this.clientManager.info.activePlayers.filter(
        (p) => teamPlayers.includes(p.login),
      ).length;

      if (selectedCount > activeTeamPlayers / 2) {
        if (this.pickBanState.currentAction.action === "pick") {
          this.pickBanState.pickedMaps.push(map.filename);

          map.pickedBy = this.pickBanState.currentAction.nickName;
          map.index = this.pickBanState.pickedMaps.length;
        } else if (this.pickBanState.currentAction.action === "ban") {
          map.bannedBy = this.pickBanState.currentAction.nickName;
        }

        this.pickBanState.currentAction = this.getNextPickBanAction();
        this.updatePickBan();
      } else {
        this.updatePickBan();
        return; // Wait for more players to select the map before proceeding
      }
    }

    await this.handleNextPickBanAction();
  };

  async onMatchStartCommand(_: string[], login: string) {
    const meta = {
      type: "plugins",
      module: "match-plugin",
      function: "onMatchStartCommand",
    };

    if (
      !this.checkCommandPermission(
        login,
        "You are not authorized to start the match",
      )
    )
      return;

    if (!(this.matchState === "not_started" || this.matchState === "ready")) {
      if (this.matchState === "pickban") {
        this.clientManager.client.call(
          "ChatSendServerMessageToLogin",
          `Pick and ban phase is still in progress, cannot start the match`,
          login,
        );
      } else {
        this.clientManager.client.call(
          "ChatSendServerMessageToLogin",
          `Match has already started, cannot start the match`,
          login,
        );
      }
      return;
    }

    if (this.config?.script) {
      try {
        await setScriptName(this.clientManager.client, this.config.script);
        this.clientManager.client.call(
          "ChatSendServerMessage",
          `Loaded match script: ${this.config.script}`,
        );
      } catch (error) {
        this.clientManager.log.error(
          { meta, error },
          "Error loading match script",
        );
        this.clientManager.client.call(
          "ChatSendServerMessageToLogin",
          `Failed to load match script: ${error}`,
          login,
        );
        return;
      }
    }

    if (
      this.matchState === "not_started" &&
      this.config?.maps &&
      this.config.maps.length > 0
    ) {
      try {
        await setMapList(this.clientManager, this.config.maps);
      } catch (error) {
        this.clientManager.log.error({ meta, error }, "Error setting map list");
        this.clientManager.client.call(
          "ChatSendServerMessageToLogin",
          `Failed to set map list: ${error}`,
          login,
        );
        return;
      }
    }

    if (this.matchState === "ready") {
      if (this.pickBanState.pickedMaps.length === 0) {
        this.clientManager.client.call(
          "ChatSendServerMessageToLogin",
          `No maps have been picked, cannot start the match`,
          login,
        );
        return;
      }

      try {
        await setMapList(this.clientManager, this.pickBanState.pickedMaps);
      } catch (error) {
        this.clientManager.log.error({ meta, error }, "Error setting map list");
        this.clientManager.client.call(
          "ChatSendServerMessageToLogin",
          `Failed to set map list: ${error}`,
          login,
        );
        return;
      }
    }

    try {
      await jumpToMapIndex(this.clientManager, 0);
      this.matchState = "in_progress";
    } catch {
      try {
        await restartMap(this.clientManager);
        this.matchState = "in_progress";
      } catch (error) {
        this.clientManager.log.error({ meta, error }, "Error starting match");
        this.clientManager.client.call(
          "ChatSendServerMessageToLogin",
          `Failed to start the match: ${error}`,
          login,
        );
      }
    }

    try {
      const mapList = await getMapList(this.clientManager);
      this.clientManager.client.call(
        "ChatSendServerMessage",
        `Maps:\n${mapList.map((map, index) => `${index + 1}. ${map.Name}`).join("\n")}`,
      );
    } catch (error) {
      this.clientManager.log.error({ meta, error }, "Error fetching map list");
      this.clientManager.client.call(
        "ChatSendServerMessageToLogin",
        `Failed to fetch map list: ${error}`,
        login,
      );
    }
  }

  async onMatchStopCommand(_: string[], login: string) {
    if (
      !this.checkCommandPermission(
        login,
        "You are not authorized to stop the match",
      )
    )
      return;

    this.widget.destroy();
    this.matchState = "not_started";

    this.clientManager.client.call("ChatSendServerMessage", "Match stopped");

    await this.setLobbyState(login);
  }

  async onPauseCommand(_: string[], login: string) {
    const meta = {
      type: "plugins",
      module: "match-plugin",
      function: "onPauseCommand",
    };

    if (
      !this.checkCommandPermission(
        login,
        "You are not authorized to pause the match",
      )
    )
      return;

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

      await pauseMatch(this.clientManager, true);
      this.clientManager.client.call(
        "ChatSendServerMessage",
        `Match paused by ${player?.nickName || login}`,
      );
    } catch (error) {
      this.clientManager.log.error({ meta, error }, "Error pausing match");
      this.clientManager.client.call(
        "ChatSendServerMessageToLogin",
        `Failed to pause the match: ${error}`,
        login,
      );
    }
  }

  async onUnpauseCommand(_: string[], login: string) {
    const meta = {
      type: "plugins",
      module: "match-plugin",
      function: "onUnpauseCommand",
    };
    if (
      !this.checkCommandPermission(
        login,
        "You are not authorized to unpause the match",
      )
    )
      return;

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

      await pauseMatch(this.clientManager, false);
      this.clientManager.client.call(
        "ChatSendServerMessage",
        `Match unpaused by ${player?.nickName || login}`,
      );
    } catch (error) {
      this.clientManager.log.error({ meta, error }, "Error unpausing match");
      this.clientManager.client.call(
        "ChatSendServerMessageToLogin",
        `Failed to unpause the match: ${error}`,
        login,
      );
    }
  }

  async onPickbanCommand(_: string[], login: string) {
    if (
      !this.checkCommandPermission(
        login,
        "You are not authorized to start the pick and ban phase",
      )
    )
      return;

    if (this.matchState !== "not_started") {
      if (this.matchState === "pickban") {
        this.clientManager.client.call(
          "ChatSendServerMessageToLogin",
          `Pick and ban phase is already in progress`,
          login,
        );
      } else {
        this.clientManager.client.call(
          "ChatSendServerMessageToLogin",
          `Match has already started, cannot start pick and ban phase`,
          login,
        );
      }
      return;
    }

    if (!this.config?.pickAndBan) {
      this.clientManager.client.call(
        "ChatSendServerMessageToLogin",
        `Pick and ban configuration is not set`,
        login,
      );
      return;
    }

    await this.setPickBanState();

    this.matchState = "pickban";
    this.displayPickBan();

    this.clientManager.client.call(
      "ChatSendServerMessage",
      `Pick and ban phase started`,
    );
  }

  async onLobbyCommand(_: string[], login: string) {
    if (
      !this.checkCommandPermission(
        login,
        "You are not authorized to execute this command",
      )
    )
      return;

    if (this.matchState !== "not_started") {
      this.clientManager.client.call(
        "ChatSendServerMessageToLogin",
        `Match has already started, cannot go to lobby`,
        login,
      );
      return;
    }

    if (
      !this.config?.lobby ||
      (!this.config.lobby.map && !this.config.lobby.script)
    ) {
      this.clientManager.client.call(
        "ChatSendServerMessageToLogin",
        `Lobby configuration is not set`,
        login,
      );
      return;
    }

    await this.setLobbyState(login);
  }

  private updatePickBan() {
    this.widget.setData({
      mapInfosJson: JSON.stringify(this.pickBanState.maps),
      currentActionJson: this.pickBanState.currentAction
        ? JSON.stringify(this.pickBanState.currentAction)
        : undefined,
    });
    this.widget.update();
  }

  private displayPickBan() {
    this.widget.setData({
      pickBanAction: "match-pickban-action",
      mapInfosJson: JSON.stringify(this.pickBanState.maps),
      currentActionJson: this.pickBanState.currentAction
        ? JSON.stringify(this.pickBanState.currentAction)
        : undefined,
    });
    this.widget.display();
  }

  private checkCommandPermission(login: string, message?: string): boolean {
    if (!this.config?.admins?.includes(login)) {
      this.clientManager.client.call(
        "ChatSendServerMessageToLogin",
        message || `You are not authorized to perform this action`,
        login,
      );
      return false;
    }
    return true;
  }

  private getCurrentPickBanAction(): PickBanAction | null {
    if (this.pickBanState.order.length < this.pickBanState.currentIndex + 1)
      return null;

    const currentAction =
      this.pickBanState.order[this.pickBanState.currentIndex];

    if (currentAction.action === "random") {
      return {
        action: "random",
        login: "",
        players: [],
        nickName: "",
      };
    }

    if (this.pickBanState.type === "player") {
      const player = this.pickBanState.players?.find(
        (p) => p.seed === currentAction.seed,
      );

      if (!player) {
        return {
          action: currentAction.action,
          login: "",
          players: [],
          nickName: "",
        };
      }

      const playerInfo = this.clientManager.info.activePlayers.find(
        (p) => p.login === player.login,
      );

      return {
        action: currentAction.action,
        login: player.login,
        players: [],
        nickName: playerInfo?.nickName || player.login,
      };
    } else if (this.pickBanState.type === "team") {
      const team = this.pickBanState.teams?.find(
        (t) => t.seed === currentAction.seed,
      );

      if (!team) {
        return {
          action: currentAction.action,
          login: "",
          players: [],
          nickName: "",
        };
      }

      return {
        action: currentAction.action,
        login: "",
        players: team.players,
        nickName: `Team ${currentAction.seed}`,
      };
    }

    return null;
  }

  private getNextPickBanAction() {
    this.pickBanState.currentIndex += 1;
    return this.getCurrentPickBanAction();
  }

  private async setPickBanState() {
    const mapsInfo = await getMapsInfo(
      this.clientManager,
      this.config?.maps || [],
    );

    const maps = mapsInfo.map((map) => ({
      name: map.Name,
      author: map.Author,
      uid: map.UId,
      filename: map.FileName,
      index: 0,
      selectedBy: [],
      pickedBy: "",
      bannedBy: "",
    }));

    const order = stringToPickAndBan(this.config?.pickAndBan?.order);
    const players = this.config?.pickAndBan?.players || [];
    const teams = this.config?.pickAndBan?.teams || [];

    this.pickBanState = {
      type: this.config?.pickAndBan?.type || "player",
      order,
      players,
      teams,
      maps,
      currentIndex: 0,
      currentAction: null,
      pickedMaps: [],
    };

    this.pickBanState.currentAction = this.getCurrentPickBanAction();
  }

  private isPickBanDone() {
    // If current index is greater than or equal to the amount of maps, then pick and ban is done
    if (this.pickBanState.currentIndex >= this.pickBanState.maps.length)
      return true;

    // If the current action is null, then pick and ban is done
    if (!this.pickBanState.currentAction) return true;

    return false;
  }

  private handleRandomPickBan() {
    const availableMaps = this.pickBanState.maps.filter(
      (map) => !map.pickedBy && !map.bannedBy,
    );

    if (availableMaps.length === 0) return;

    const randomIndex = Math.floor(Math.random() * availableMaps.length);
    const randomMap = availableMaps[randomIndex];

    if (!randomMap) return;

    this.pickBanState.pickedMaps.push(randomMap.filename);
    randomMap.pickedBy = "random";
    randomMap.index = this.pickBanState.pickedMaps.length;
  }

  private async handleNextPickBanAction() {
    if (this.isPickBanDone()) {
      await sleep(10000);
      this.matchState = "ready";
      this.clientManager.client.call(
        "ChatSendServerMessage",
        `Pick and ban phase completed, match is ready to start`,
      );
      this.widget.destroy();
      return;
    }

    if (this.pickBanState.currentAction?.action === "random") {
      await sleep(1000); // Wait for 1 second before handling the next action
      this.handleRandomPickBan();
      this.pickBanState.currentAction = this.getNextPickBanAction();
      this.updatePickBan();
      this.handleNextPickBanAction();
    }
  }

  private async setLobbyState(login: string = "") {
    const meta = {
      type: "plugins",
      module: "match-plugin",
      function: "setLobbyState",
    };
    if (this.config?.lobby?.script) {
      try {
        await setScriptName(
          this.clientManager.client,
          this.config.lobby.script,
        );
        this.clientManager.client.call(
          "ChatSendServerMessage",
          `Loaded lobby script: ${this.config.lobby.script}`,
        );
      } catch (error) {
        this.clientManager.log.error(
          { meta, error },
          "Error loading lobby script",
        );
        this.clientManager.client.call(
          "ChatSendServerMessageToLogin",
          `Failed to load lobby script: ${error}`,
          login,
        );
      }
    }

    if (this.config?.lobby?.map) {
      try {
        await setMapList(this.clientManager, [this.config.lobby.map]);
      } catch (error) {
        this.clientManager.log.error(
          { meta, error },
          "Error setting lobby map",
        );
        this.clientManager.client.call(
          "ChatSendServerMessageToLogin",
          `Failed to set lobby map: ${error}`,
          login,
        );
      }
    }

    try {
      await jumpToMapIndex(this.clientManager, 0);
      this.matchState = "not_started";
    } catch {
      try {
        await restartMap(this.clientManager);
        this.matchState = "not_started";
      } catch (error) {
        this.clientManager.log.error({ meta, error }, "Error going to lobby");
        this.clientManager.client.call(
          "ChatSendServerMessageToLogin",
          `Failed to go to lobby: ${error}`,
          login,
        );
      }
    }
  }
}
