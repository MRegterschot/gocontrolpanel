import { getLocalRecord } from "@/actions/database/server-only/records";
import { getMapLeaderboard, getMapRecordsByAccounts } from "@/lib/api/nadeo";
import { logger } from "@/lib/logger";
import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import ManialinkManager from "@/lib/managers/manialink-manager";
import Widget from "@/lib/manialink/components/widget";
import { getSpectatorStatus } from "@/lib/utils";
import { SMapInfo } from "@/types/gbx/map";
import { SPlayerInfo } from "@/types/gbx/player";
import { Scores } from "@/types/gbx/scores";
import { Waypoint, WaypointEvent } from "@/types/gbx/waypoint";
import { LiveInfo, PlayerRound } from "@/types/live";
import { PlayerInfo } from "@/types/player";
import slugid from "slugid";
import Plugin from "..";

type Round = {
  login: string;
  name: string;
  rank: number;
  points: number;
  checkpoints: number[];
  time: number;
};

type Finish = {
  login: string;
  points: number;
  isPersonalBest: boolean;
  isLocalRecord: boolean;
  isWorldRecord: boolean;
};

type RecordsInfo = {
  worldRecord: number;
  localRecord: number;
  [key: string]: number;
};

export default class LiveRoundPlugin extends Plugin {
  static pluginId = "live-round";
  static gamemodes = ["rounds", "cup", "reversecup"];
  private widget: Widget;
  private liveFastestTime: number | null = null;

  private rounds: Round[] = [];
  private finishes: Finish[] = [];
  private pointsLimit: number = -1;
  private pointsRepartition: number[] = [];

  private recordsInfo: RecordsInfo = {
    worldRecord: 0,
    localRecord: 0,
  };

  constructor(
    clientManager: GbxClientManager,
    manialinkManager: ManialinkManager,
  ) {
    super(clientManager, manialinkManager);
    this.widget = new Widget(manialinkManager);
    this.widget.setTemplate("widgets/live-round/live-round");
    this.widget.setId("live-round-widget");
    this.widget.setPosition({ x: -156, y: 73.5 });
  }

  async onLoad() {
    this.clientManager.addListeners(this.getPluginId(), {
      beginMap: this.onBeginMap.bind(this),
      beginMatch: this.onBeginMatch.bind(this),
      playerConnect: this.onPlayerConnect.bind(this),
      playerInfo: this.onPlayerInfo.bind(this),
      playerDisconnect: this.onPlayerDisconnect.bind(this),
      startRound: this.onStartRound.bind(this),
      checkpoint: this.onCheckpoint.bind(this),
      finish: this.onFinish.bind(this),
      giveUp: this.onGiveUp.bind(this),
      updatedSettings: this.onUpdatedSettings.bind(this),
      scores: this.onScores.bind(this),
      playerUpdated: this.onPlayerUpdated.bind(this),
    });
  }

  async onUnload() {
    this.widget.destroy();
    this.clientManager.removeListeners(this.getPluginId());
  }

  async onStart() {
    this.widget.display();
    this.clearLiveRound();
    this.updateRecordsInfo();
  }

  async onPlayerConnect(playerInfo: PlayerInfo) {
    const map: SMapInfo =
      await this.clientManager.client.call("GetCurrentMapInfo");

    try {
      const personalBest = await getMapRecordsByAccounts(map.UId, [
        slugid.decode(playerInfo.login),
      ]);

      this.recordsInfo[playerInfo.login] = personalBest[0]
        ? personalBest[0].recordScore.time
        : 0;
    } catch (error) {
      logger.error(error, "Error fetching personal best for player connect");
      this.recordsInfo[playerInfo.login] =
        this.recordsInfo[playerInfo.login] || 0;
    }

    const playerStatus = this.clientManager.reverseCupGetPlayerStatus(
      playerInfo.login,
    );

    if (
      getSpectatorStatus(playerInfo.spectatorStatus).spectator ||
      this.rounds.find((r) => r.login === playerInfo.login) ||
      playerStatus.spectator ||
      playerStatus.eliminated
    )
      return;

    this.rounds.push({
      login: playerInfo.login,
      name: playerInfo.nickName,
      rank: 0,
      time: 0,
      checkpoints: [],
      points: 0,
    });

    await this.updateWidget();
  }

  async onPlayerDisconnect(login: string) {
    const round = this.rounds.find((r) => r.login === login);
    if (!round) return;

    this.rounds = this.rounds.filter((r) => r.login !== login);
    await this.updateWidget();
  }

  async onPlayerInfo(playerInfo: PlayerInfo) {
    const playerStatus = this.clientManager.reverseCupGetPlayerStatus(
      playerInfo.login,
    );

    if (
      getSpectatorStatus(playerInfo.spectatorStatus).spectator ||
      playerStatus.spectator ||
      playerStatus.eliminated
    ) {
      this.rounds = this.rounds.filter((r) => r.login !== playerInfo.login);
    } else {
      const round = this.rounds.find((r) => r.login === playerInfo.login);

      if (!round) {
        this.rounds.push({
          login: playerInfo.login,
          name: playerInfo.nickName,
          rank: 0,
          time: 0,
          checkpoints: [],
          points: 0,
        });
      } else {
        for (let i = 0; i < this.rounds.length; i++) {
          if (this.rounds[i].login === playerInfo.login) {
            this.rounds[i].name = playerInfo.nickName;
            this.rounds[i].time = 0;
            this.rounds[i].checkpoints = [];
            break;
          }
        }
      }
    }

    await this.updateWidget();
  }

  async onPlayerUpdated(playerRound: PlayerRound) {
    const round = this.rounds.find((r) => r.login === playerRound.login);
    if (!round) return;

    round.points = playerRound.matchPoints;

    await this.updateWidget();
  }

  async onStartRound() {
    this.clearLiveRound();
  }

  async onBeginMap() {
    this.liveFastestTime = null;
    this.clearLiveRound();
    this.updateRecordsInfo();
  }

  async onBeginMatch() {
    this.clearLiveRound();
  }

  async onUpdatedSettings(liveInfo: LiveInfo) {
    this.pointsLimit = liveInfo.pointsLimit || -1;
    this.pointsRepartition = liveInfo.pointsRepartition || [];

    this.updateWidget();
  }

  async onCheckpoint(checkpoint: Waypoint) {
    if (this.clientManager.info.liveInfo.isWarmUp) return;

    for (let i = 0; i < this.rounds.length; i++) {
      if (this.rounds[i].login === checkpoint.login) {
        this.rounds[i].time = checkpoint.racetime;
        this.rounds[i].checkpoints = checkpoint.curracecheckpoints;

        await this.updateWidget();
        return;
      }
    }
  }

  async onFinish(finish: Waypoint) {
    if (this.clientManager.info.liveInfo.isWarmUp) return;

    if (finish.racetime === 0) return;

    let isFastest = false;
    if (
      this.liveFastestTime === null ||
      finish.racetime < this.liveFastestTime
    ) {
      this.liveFastestTime = finish.racetime;
      isFastest = true;
    }

    for (let i = 0; i < this.rounds.length; i++) {
      if (this.rounds[i].login === finish.login) {
        this.rounds[i].time = finish.racetime;
        this.rounds[i].checkpoints = finish.curracecheckpoints;

        this.finishes.push({
          login: finish.login,
          points: 0,
          isPersonalBest:
            this.recordsInfo[finish.login] > 0 &&
            finish.racetime < this.recordsInfo[finish.login],
          isLocalRecord:
            isFastest && this.fasterThanLocalRecord(finish.racetime),
          isWorldRecord:
            isFastest && this.fasterThanWorldRecord(finish.racetime),
        });

        await this.updateWidget();

        if (
          this.recordsInfo[finish.login] === 0 ||
          finish.racetime < this.recordsInfo[finish.login]
        ) {
          this.recordsInfo[finish.login] = finish.racetime;
        }

        if (isFastest) {
          if (this.fasterThanLocalRecord(finish.racetime)) {
            this.recordsInfo.localRecord = finish.racetime;
          }

          if (this.fasterThanWorldRecord(finish.racetime)) {
            this.recordsInfo.worldRecord = finish.racetime;
          }
        }

        return;
      }
    }
  }

  async onGiveUp(giveUp: WaypointEvent) {
    if (this.clientManager.info.liveInfo.isWarmUp) return;

    for (let i = 0; i < this.rounds.length; i++) {
      if (this.rounds[i].login === giveUp.login) {
        this.rounds[i].time = -1;

        await this.updateWidget();
        return;
      }
    }
  }

  async onScores(scores: Scores) {
    if (
      scores.responseid !== this.getPluginId() &&
      scores.section !== "EndRound"
    )
      return;

    for (let i = 0; i < scores.players.length; i++) {
      for (let j = 0; j < this.rounds.length; j++) {
        if (this.rounds[j].login === scores.players[i].login) {
          if (
            scores.players[i].matchpoints > this.pointsLimit &&
            this.pointsLimit > 0
          ) {
            this.rounds = this.rounds.filter(
              (r) => r.login !== scores.players[i].login,
            );
          } else {
            this.rounds[j].points = scores.players[i].matchpoints;
          }

          break;
        }
      }
    }

    this.rounds = this.rounds.filter(
      (r) =>
        this.clientManager.info.liveInfo.type !== "reversecup" ||
        r.points > -2000,
    );

    await this.updateWidget();
  }

  async updateRecordsInfo() {
    const map: SMapInfo =
      await this.clientManager.client.call("GetCurrentMapInfo");

    const players = this.clientManager.info.activePlayers
      .map((p) => p.login)
      .filter((login) => !login.includes("fakeplayer"));

    if (!map) {
      this.recordsInfo = {
        worldRecord: 0,
        localRecord: 0,
      };

      players.forEach((p) => {
        this.recordsInfo[p] = 0;
      });
    } else {
      const localRecord = await getLocalRecord(
        this.clientManager.getServerId(),
        map.UId,
      );

      this.recordsInfo.localRecord = localRecord ? localRecord.time : 0;

      const onlineLeaderboard = await getMapLeaderboard(map.UId);
      if (
        onlineLeaderboard.tops.length > 0 &&
        onlineLeaderboard.tops[0].top.length > 0
      ) {
        const wr = onlineLeaderboard.tops[0].top[0];

        this.recordsInfo.worldRecord = wr.score;
      } else {
        this.recordsInfo.worldRecord = 0;
      }

      try {
        const personalBests = await getMapRecordsByAccounts(
          map.UId,
          players.map((p) => slugid.decode(p)),
        );

        players.forEach((p) => {
          const pb = personalBests.find(
            (r) => r.accountId === slugid.decode(p),
          );
          this.recordsInfo[p] = pb ? pb.recordScore.time : 0;
        });
      } catch (error) {
        logger.error(error, "Error fetching personal bests");
        players.forEach((p) => {
          this.recordsInfo[p] = this.recordsInfo[p] || 0;
        });
      }
    }
  }

  async clearLiveRound() {
    this.pointsLimit = this.clientManager.info.liveInfo.pointsLimit || -1;
    this.pointsRepartition =
      this.clientManager.info.liveInfo.pointsRepartition || [];

    this.finishes = [];
    this.rounds = [];

    const playerList: SPlayerInfo[] = await this.clientManager.client.call(
      "GetPlayerList",
      1000,
      0,
    );

    const mainServerInfo = await this.clientManager.client.call(
      "GetMainServerPlayerInfo",
    );

    if (playerList && Array.isArray(playerList)) {
      for (let i = 0; i < playerList.length; i++) {
        const player = playerList[i];
        if (!player.Login || player.Login === mainServerInfo.Login) {
          continue; // Skip the main server player
        }

        const playerStatus = this.clientManager.reverseCupGetPlayerStatus(
          player.Login,
        );

        if (
          getSpectatorStatus(player.SpectatorStatus).spectator ||
          playerStatus.spectator ||
          playerStatus.eliminated
        ) {
          continue; // Skip spectators and eliminated players
        }

        this.rounds.push({
          login: player.Login,
          name: player.NickName,
          rank: 0,
          time: 0,
          checkpoints: [],
          points: 0,
        });
      }
    }

    await this.clientManager.client.callScript(
      "Trackmania.GetScores",
      this.getPluginId(),
    );
  }

  async updateWidget() {
    this.rounds.sort((a, b) => {
      // Sort by checkpoint (count higher is better)
      if (b.checkpoints.length !== a.checkpoints.length) {
        return b.checkpoints.length - a.checkpoints.length;
      }

      // If checkpoints are equal, sort by time (lower is better)
      if (a.time !== b.time) {
        return a.time - b.time;
      }

      // If still equal, sort by fastest checkpoints recursively
      for (let i = 0; i < a.checkpoints.length; i++) {
        if (a.checkpoints[i] !== b.checkpoints[i]) {
          return a.checkpoints[i] - b.checkpoints[i];
        }
      }

      return 0;
    });

    for (let i = 0; i < this.rounds.length; i++) {
      this.rounds[i].rank = i + 1;
    }

    // Make sure finishes are sorted correctly in the same order as rounds
    this.finishes.sort((a, b) => {
      const roundA = this.rounds.find((r) => r.login === a.login);
      const roundB = this.rounds.find((r) => r.login === b.login);

      if (!roundA || !roundB) return 0;

      return roundA.rank - roundB.rank;
    });

    // Make sure to update points for finishes based on their position
    for (let i = 0; i < this.finishes.length; i++) {
      const finish = this.finishes[i];
      const round = this.rounds.find((r) => r.login === finish.login);
      if (!round) continue;

      const position = Math.min(i, this.pointsRepartition.length - 1);
      let points = this.pointsRepartition[position] || 0;

      if (this.clientManager.info.liveInfo.type === "reversecup") {
        const playerCount = this.rounds.filter((r) => r.points > -2000).length;

        const repartition =
          this.clientManager.reverseCupGetPointsRepartition(playerCount);

        const position = Math.min(i, repartition.length - 1);

        points = -repartition[position] || 0;
      }

      this.finishes[i].points = points;
    }

    // Make sure only the first finish has the world/local record if it's faster than the current ones
    if (this.finishes.length > 0) {
      const firstFinish = this.finishes[0];
      const round = this.rounds.find((r) => r.login === firstFinish.login);

      if (round) {
        firstFinish.isLocalRecord =
          this.fasterThanLocalRecord(round.time) && round.time > 0;
        firstFinish.isWorldRecord =
          this.fasterThanWorldRecord(round.time) && round.time > 0;
      }
    }

    if (this.finishes.length > 1) {
      for (let i = 1; i < this.finishes.length; i++) {
        this.finishes[i].isLocalRecord = false;
        this.finishes[i].isWorldRecord = false;
      }
    }

    this.widget.setData({
      roundsJson: JSON.stringify(this.rounds),
      finishesJson: JSON.stringify(this.finishes),
      mode: this.clientManager.info.liveInfo.type,
      pointsLimit: this.pointsLimit,
    });
    this.widget.update();
  }

  private fasterThanLocalRecord(time: number) {
    return (
      this.recordsInfo.localRecord === 0 || time < this.recordsInfo.localRecord
    );
  }

  private fasterThanWorldRecord(time: number) {
    return time < this.recordsInfo.worldRecord;
  }
}
