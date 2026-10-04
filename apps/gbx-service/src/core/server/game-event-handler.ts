import type {
  Elimination,
  EndMap,
  PauseStatus,
  PlayerChat,
  PlayerInfo,
  PlayerManialinkPageAnswer,
  PlayerWaypoint,
  Scores,
  SMapInfo,
  SPlayerInfo,
  StartMap,
  WarmUp,
  WarmUpStatus,
  Waypoint,
  WaypointEvent,
} from "@tmcp/shared";
import type { ChatService } from "../chat/chat-service";
import type { CommandRouter } from "../chat/command-router";
import { TypedEventBus } from "../events";
import type { GameEvent } from "../gbx/callbacks";
import type { GbxConnection } from "../gbx/connection";
import type { LiveState } from "../live/live-state";
import {
  isEliminated,
  isFinalist,
  isLastChance,
  isWinner,
} from "../live/points";
import type { Logger } from "../logger";
import type { ActionRouter } from "../manialink/action-router";
import type { Clock, PlayerRepository } from "../ports";
import type { Jukebox } from "./jukebox";
import { RESPONSE_ID, type LiveSync } from "./live-sync";
import type { MatchRecorder } from "./match-recorder";
import { fetchPlayerInfo } from "./players";
import type { ServerEventMap } from "./server-events";

export interface GameEventHandlerDeps {
  gbx: GbxConnection;
  state: LiveState;
  bus: TypedEventBus<ServerEventMap>;
  chat: ChatService;
  commands: CommandRouter;
  actions: ActionRouter;
  players: PlayerRepository;
  liveSync: LiveSync;
  recorder: MatchRecorder;
  jukebox: Jukebox;
  clock: Clock;
  log: Logger;
}

// Delay before re-emitting state, giving the server time to answer the status requests we just sent
const STATUS_SETTLE_MS = 300;

// Applies parsed server callbacks to the live state and emits the matching runtime events
export class GameEventHandler {
  constructor(private readonly deps: GameEventHandlerDeps) {}

  async handle(event: GameEvent): Promise<void> {
    try {
      await this.dispatch(event);
    } catch (error) {
      this.deps.log.error({ err: error, event: event.type }, "Failed to handle game event");
    }
  }

  private dispatch(event: GameEvent): Promise<void> | void {
    switch (event.type) {
      case "playerConnect":
        return this.onPlayerConnect(event.login);
      case "playerDisconnect":
        return this.onPlayerDisconnect(event.login);
      case "playerInfoChanged":
        return this.onPlayerInfoChanged(event.player);
      case "beginMap":
        return this.onBeginMap(event.map);
      case "endMap":
        return this.deps.bus.emit("endMap", event.map.UId);
      case "beginMatch":
        return this.onBeginMatch();
      case "echo":
        return this.onEcho(event.internal);
      case "playerChat":
        return this.onPlayerChat(event.chat);
      case "manialinkAnswer":
        return this.onManialinkAnswer(event.answer);
      case "podiumStart":
        return this.onPodiumStart();
      case "waypoint":
        return this.onWaypoint(event.waypoint);
      case "endMapStart":
        return this.onEndMapStart(event.endMap);
      case "startMapStart":
        return this.onStartMapStart(event.startMap);
      case "startRoundStart":
        return this.onStartRound();
      case "scores":
        return this.onScores(event.scores);
      case "warmUpStatus":
        return this.onWarmUpStatus(event.status);
      case "pauseStatus":
        return this.onPauseStatus(event.status);
      case "giveUp":
        return this.onGiveUp(event.event);
      case "skipOutro":
        return this.deps.bus.emit("skipOutro", event.event);
      case "startLine":
        return this.deps.bus.emit("startLine", event.event);
      case "warmUpStart":
        return this.onWarmUpToggle(true);
      case "warmUpEnd":
        return this.onWarmUpToggle(false);
      case "warmUpStartRound":
        return this.onWarmUpStartRound(event.warmUp);
      case "elimination":
        return this.onElimination(event.elimination);
    }
  }

  private async findOrFetchPlayer(login: string): Promise<PlayerInfo> {
    return (
      this.deps.state.findActivePlayer(login) ??
      (await fetchPlayerInfo(this.deps.gbx, login))
    );
  }

  private async onPlayerConnect(login: string): Promise<void> {
    const { state, bus, log } = this.deps;
    const player = await fetchPlayerInfo(this.deps.gbx, login);

    try {
      await this.deps.players.upsert(player);
    } catch (error) {
      log.error({ err: error, login }, "Failed to sync player on connect");
    }

    state.upsertActivePlayer(player);
    bus.emit("playerConnect", player);

    state.patchPlayer(player.login, {
      login: player.login,
      name: player.nickName,
      team: player.teamId,
    });

    if (
      player.spectatorStatus === 0 &&
      !state.reverseCupGetPlayerStatus(player.login).spectator
    ) {
      state.setActiveRoundPlayer(player.login, {
        login: player.login,
        accountId: "",
        time: 0,
        hasFinished: false,
        hasGivenUp: false,
        isFinalist: false,
        isLastChance: false,
        isEliminated: false,
        checkpoint: 0,
      });
    } else {
      state.setActiveRoundPlayer(player.login, undefined);
    }

    bus.emit("playerConnectInfo", state.liveInfo);
    await this.deps.chat.announcePlayerConnect(player);
  }

  private async onPlayerDisconnect(login: string): Promise<void> {
    const { state, bus } = this.deps;

    if (state.chat?.disconnectMessage) {
      let player: PlayerInfo;
      try {
        player = await this.findOrFetchPlayer(login);
      } catch {
        player = { login, nickName: login, playerId: 0, spectatorStatus: 0, teamId: 0 };
      }
      await this.deps.chat.announcePlayerDisconnect(player);
    }

    state.removeActivePlayer(login);
    bus.emit("playerDisconnect", login);

    state.patchPlayer(login, { connected: false });
    state.setActiveRoundPlayer(login, undefined);
    bus.emit("playerDisconnectInfo", state.liveInfo.activeRound);
  }

  private onPlayerInfoChanged(info: SPlayerInfo): void {
    const { state, bus } = this.deps;
    if (!info.Login) return;

    const player: PlayerInfo = {
      login: info.Login,
      nickName: info.NickName,
      playerId: info.PlayerId,
      spectatorStatus: info.SpectatorStatus,
      teamId: info.TeamId,
    };

    state.upsertActivePlayer(player);
    bus.emit("playerInfo", player);

    const round = state.patchPlayer(player.login, {
      team: player.teamId,
      name: player.nickName,
    });

    if (
      info.SpectatorStatus !== 0 ||
      state.reverseCupGetPlayerStatus(player.login).spectator
    ) {
      state.setActiveRoundPlayer(player.login, undefined);
    } else {
      state.setActiveRoundPlayer(player.login, {
        login: player.login,
        accountId: "",
        time: 0,
        hasFinished: false,
        hasGivenUp: false,
        isFinalist: isFinalist(round.matchPoints, state.liveInfo.pointsLimit),
        isLastChance: state.isReverseCup && isLastChance(round.matchPoints),
        isEliminated: state.isReverseCup && isEliminated(round.matchPoints),
        checkpoint: 0,
      });
    }

    bus.emit("playerInfoChanged", state.liveInfo.activeRound);
  }

  private onBeginMap(map: SMapInfo): void {
    const { state, bus, log } = this.deps;

    // Not awaited: listeners get beginMap immediately, the DB row follows shortly after
    this.deps.liveSync
      .syncMap()
      .catch((error) => log.error({ err: error }, "Failed to sync map"));

    state.liveInfo.currentMap = map.UId;
    state.roundNumber = state.liveInfo.type === "timeattack" ? null : 0;
    bus.emit("beginMap", map.UId);
  }

  private async onBeginMatch(): Promise<void> {
    await this.deps.liveSync.syncLiveInfo();
    await this.deps.clock.sleep(STATUS_SETTLE_MS);
    this.deps.bus.emit("beginMatch", this.deps.state.liveInfo);
  }

  private async onEcho(internal: string): Promise<void> {
    if (internal !== "UpdatedSettings") return;
    await this.deps.liveSync.refreshScriptSettings();
    this.deps.bus.emit("updatedSettings", this.deps.state.liveInfo);
  }

  private async onPlayerChat(chat: PlayerChat): Promise<void> {
    const { bus, commands, log } = this.deps;
    if (!chat.Login) return;

    if (chat.Text.startsWith("/")) {
      commands
        .dispatch(chat.Text, chat.Login)
        .catch((error) => log.error({ err: error }, "Command dispatch failed"));
    }

    const player = await this.findOrFetchPlayer(chat.Login);
    bus.emit("playerChat", { ...chat, Name: player.nickName });
    await this.deps.chat.routePlayerMessage(chat, player.nickName);
  }

  private onManialinkAnswer(answer: PlayerManialinkPageAnswer): void {
    this.deps.bus.emit("playerManialinkPageAnswer", answer);
    this.deps.actions
      .dispatch(answer)
      .catch((error) => this.deps.log.error({ err: error }, "Action dispatch failed"));
  }

  private async onPodiumStart(): Promise<void> {
    this.deps.jukebox
      .queueNextMap()
      .catch((error) => this.deps.log.error({ err: error }, "Failed to queue jukebox map"));
    await this.deps.liveSync.prepareNextMode();
  }

  private onWaypoint(waypoint: Waypoint): void {
    if (waypoint.isendrace) {
      this.deps.recorder
        .recordFinish(waypoint)
        .catch((error) => this.deps.log.error({ err: error }, "Failed to record finish"));
      this.onFinish(waypoint);
    } else {
      this.onCheckpoint(waypoint);
    }
  }

  private onFinish(waypoint: Waypoint): void {
    const { state, bus } = this.deps;

    state.setActiveRoundPlayer(waypoint.login, {
      ...state.liveInfo.activeRound?.players?.[waypoint.login],
      login: waypoint.login,
      accountId: waypoint.accountid,
      time: waypoint.racetime,
      hasFinished: true,
      hasGivenUp: false,
      checkpoint: waypoint.checkpointinrace + 1,
    } as PlayerWaypoint);

    bus.emit("finish", waypoint);
    bus.emit("live-finish", state.liveInfo.activeRound);

    if (state.liveInfo.type !== "timeattack") return;

    const round = state.getPlayerRound(waypoint.login);
    if (!round || (round.bestTime > 0 && round.bestTime <= waypoint.racetime)) {
      return;
    }

    state.setPlayer(waypoint.login, {
      ...round,
      bestTime: waypoint.racetime,
      bestCheckpoints: waypoint.curracecheckpoints,
    });
    bus.emit("personalBest", state.liveInfo);
  }

  private onCheckpoint(waypoint: Waypoint): void {
    const { state, bus } = this.deps;
    bus.emit("checkpoint", waypoint);

    state.setActiveRoundPlayer(waypoint.login, {
      ...state.liveInfo.activeRound?.players?.[waypoint.login],
      login: waypoint.login,
      accountId: waypoint.accountid,
      time: waypoint.racetime,
      hasFinished: false,
      hasGivenUp: false,
      checkpoint: waypoint.checkpointinrace + 1,
    } as PlayerWaypoint);

    bus.emit("live-checkpoint", state.liveInfo.activeRound);
  }

  private onEndMapStart(endMap: EndMap): void {
    this.deps.state.activeMapUid = endMap.map.uid;
    this.deps.bus.emit("endMap", endMap.map.uid);
  }

  private onStartMapStart(startMap: StartMap): void {
    this.deps.state.activeMapUid = startMap.map.uid;
    this.deps.bus.emit("startMap", startMap.map.uid);
  }

  private async onStartRound(): Promise<void> {
    const { state, bus, gbx } = this.deps;

    if (state.roundNumber !== null && !state.liveInfo.isWarmUp) {
      state.roundNumber++;
    }
    bus.emit("startRound");

    const playerList = await gbx.call<SPlayerInfo[]>("GetPlayerList", 1000, 0);
    state.resetActiveRound(playerList, "computed");
    bus.emit("beginRound", state.liveInfo.activeRound);
  }

  private async onScores(scores: Scores): Promise<void> {
    this.deps.bus.emit("scores", scores);

    if (scores.section === "EndRound") {
      await this.onEndRound(scores);
    } else if (scores.section === "PreEndRound") {
      this.onPreEndRound(scores);
    }

    await this.onScoresResponse(scores);
  }

  private async onEndRound(scores: Scores): Promise<void> {
    const { state, bus, gbx, clock } = this.deps;
    bus.emit("endRound", scores);

    if (scores.useteams) {
      for (const team of scores.teams) {
        state.setTeam(team.id, {
          ...state.liveInfo.teams?.[team.id],
          id: team.id,
          name: team.name,
          mapPoints: team.mappoints,
          matchPoints: team.matchpoints,
          roundPoints: team.roundpoints,
        });
      }
    }

    const limit = state.liveInfo.pointsLimit;
    for (const player of scores.players) {
      state.patchPlayer(player.login, {
        login: player.login,
        roundPoints: player.roundpoints,
        matchPoints: player.matchpoints,
        finalist: isFinalist(player.matchpoints, limit),
        lastChance: state.isReverseCup && isLastChance(player.matchpoints),
        eliminated: state.isReverseCup
          ? isEliminated(player.matchpoints)
          : state.getPlayerRound(player.login)?.eliminated,
        winner: isWinner(player.matchpoints, limit),
        bestTime: player.bestracetime,
        bestCheckpoints: player.bestracecheckpoints,
        prevTime: player.prevracetime,
        prevCheckpoints: player.prevracecheckpoints,
      });
    }

    await gbx.callScript("Maniaplanet.Pause.GetStatus", RESPONSE_ID);
    await clock.sleep(STATUS_SETTLE_MS);
    bus.emit("live-endRound", state.liveInfo);
  }

  private onPreEndRound(scores: Scores): void {
    this.deps.recorder
      .recordRound(scores)
      .catch((error) => this.deps.log.error({ err: error }, "Failed to record round"));
  }

  // Full scoreboard requested by us (responseid) after connect/BeginMatch
  private async onScoresResponse(scores: Scores): Promise<void> {
    if (scores.responseid !== RESPONSE_ID) return;
    const { state, gbx } = this.deps;

    if (scores.useteams) {
      for (const team of scores.teams) {
        state.setTeam(team.id, {
          id: team.id,
          name: team.name,
          matchPoints: team.matchpoints,
          mapPoints: team.mappoints,
          roundPoints: team.roundpoints,
        });
      }
    }

    const sorted = [...scores.players].sort((a, b) =>
      a.matchpoints !== b.matchpoints
        ? b.matchpoints - a.matchpoints
        : a.bestracetime - b.bestracetime,
    );

    const limit = state.liveInfo.pointsLimit;
    for (const player of sorted) {
      state.setPlayer(player.login, {
        login: player.login,
        accountId: player.accountid,
        name: player.name,
        team: player.team,
        rank: player.rank,
        finalist: isFinalist(player.matchpoints, limit),
        lastChance: state.isReverseCup && isLastChance(player.matchpoints),
        eliminated: state.isReverseCup && isEliminated(player.matchpoints),
        winner: isWinner(player.matchpoints, limit),
        roundPoints: player.roundpoints,
        matchPoints: player.matchpoints,
        bestTime: player.bestracetime,
        bestCheckpoints: player.bestracecheckpoints,
        prevTime: player.prevracetime,
        prevCheckpoints: player.prevracecheckpoints,
        connected: true,
      });
    }

    const playerList = await gbx.call<SPlayerInfo[]>("GetPlayerList", 1000, 0);
    state.resetActiveRound(playerList, "fromRound");
  }

  private onWarmUpStatus(status: WarmUpStatus): void {
    if (status.responseid !== RESPONSE_ID) return;
    this.deps.state.liveInfo.isWarmUp = status.active;
  }

  private onPauseStatus(status: PauseStatus): void {
    if (status.responseid !== RESPONSE_ID) return;
    const { state } = this.deps;

    // A pause toggled mid-round restarts that round, so it is not counted twice
    if (
      state.liveInfo.isPaused !== status.active &&
      state.roundNumber !== null &&
      state.roundNumber > 0
    ) {
      state.roundNumber--;
    }

    state.liveInfo.pauseAvailable = status.available;
    state.liveInfo.isPaused = status.active;
  }

  private onGiveUp(event: WaypointEvent): void {
    const { state, bus } = this.deps;
    bus.emit("giveUp", event);

    state.setActiveRoundPlayer(event.login, {
      ...state.liveInfo.activeRound?.players?.[event.login],
      login: event.login,
      hasGivenUp: true,
    } as PlayerWaypoint);

    bus.emit("live-giveUp", state.liveInfo.activeRound);
  }

  private onWarmUpToggle(active: boolean): void {
    this.deps.state.liveInfo.isWarmUp = active;
    this.deps.bus.emit(active ? "warmUpStart" : "warmUpEnd", this.deps.state.liveInfo);
  }

  private async onWarmUpStartRound(warmUp: WarmUp): Promise<void> {
    const { state, bus, gbx } = this.deps;

    state.liveInfo.isWarmUp = true;
    state.liveInfo.warmUpRound = warmUp.current;
    state.liveInfo.warmUpTotalRounds = warmUp.total;

    const playerList = await gbx.call<SPlayerInfo[]>("GetPlayerList", 1000, 0);
    state.resetActiveRound(playerList, "computed");
    bus.emit("warmUpStartRound", state.liveInfo);
  }

  private onElimination(elimination: Elimination): void {
    const { state, bus } = this.deps;

    for (const accountId of elimination.accountids) {
      const player = Object.values(state.liveInfo.players).find(
        (p) => p.accountId === accountId,
      );
      if (player) state.patchPlayer(player.login, { eliminated: true });
    }

    bus.emit("elimination", state.liveInfo);
  }
}
