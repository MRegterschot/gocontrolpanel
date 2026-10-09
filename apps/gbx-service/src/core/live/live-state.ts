import {
  ChatConfig,
  createEmptyLiveInfo,
  DEFAULT_THEME,
  LiveInfo,
  ManialinkTheme,
  PlayerInfo,
  PlayerRound,
  PlayerStatus,
  PlayerWaypoint,
  SPlayerInfo,
  Team,
} from "@gcp/shared";
import type { MapRecord, ServerPluginRecord } from "../ports";
import { ParsedScriptSettings } from "./modes";
import { isEliminated, isFinalist, isLastChance } from "./points";

// In-memory game state of one dedicated server; mutated only by the runtime's handlers
export class LiveState {
  liveInfo: LiveInfo = createEmptyLiveInfo();
  activePlayers: PlayerInfo[] = [];
  activeMapUid: string | null = null;
  // DB row of the current map, needed to attach matches and records
  activeMapRecord: MapRecord | null = null;
  chat: ChatConfig | null = null;
  enableHelpCommand = true;
  theme: ManialinkTheme = DEFAULT_THEME;
  plugins: ServerPluginRecord[] = [];

  currentMatchId: string | null = null;
  // null in time attack; 0 at map start otherwise
  roundNumber: number | null = null;
  modeChanged = false;

  reset(): void {
    this.liveInfo = createEmptyLiveInfo();
    this.activePlayers = [];
    this.activeMapUid = null;
    this.activeMapRecord = null;
    this.currentMatchId = null;
    this.roundNumber = null;
    this.modeChanged = false;
  }

  get isReverseCup(): boolean {
    return this.liveInfo.type === "reversecup";
  }

  findActivePlayer(login: string): PlayerInfo | undefined {
    return this.activePlayers.find((p) => p.login === login);
  }

  upsertActivePlayer(player: PlayerInfo): void {
    const index = this.activePlayers.findIndex((p) => p.login === player.login);
    if (index === -1) {
      this.activePlayers.push(player);
    } else {
      this.activePlayers[index] = player;
    }
  }

  removeActivePlayer(login: string): void {
    this.activePlayers = this.activePlayers.filter((p) => p.login !== login);
  }

  setActiveRoundPlayer(login: string, player: PlayerWaypoint | undefined): void {
    if (!this.liveInfo.activeRound) {
      this.liveInfo.activeRound = { players: {} };
    }

    if (player) {
      this.liveInfo.activeRound.players = {
        ...this.liveInfo.activeRound.players,
        [login]: player,
      };
    } else {
      delete this.liveInfo.activeRound.players?.[login];
    }
  }

  setTeam(teamId: number, team: Team | undefined): void {
    if (!this.liveInfo.teams) this.liveInfo.teams = {};

    if (team) {
      this.liveInfo.teams[teamId] = team;
    } else {
      delete this.liveInfo.teams[teamId];
    }
  }

  getPlayerRound(login: string): PlayerRound | undefined {
    return this.liveInfo.players?.[login];
  }

  // Merges into the existing entry; rounds are partial until the first scores arrive
  patchPlayer(login: string, patch: Partial<PlayerRound>): PlayerRound {
    if (!this.liveInfo.players) this.liveInfo.players = {};
    const next = { ...this.liveInfo.players[login], ...patch } as PlayerRound;
    this.liveInfo.players[login] = next;
    return next;
  }

  setPlayer(login: string, player: PlayerRound | undefined): void {
    if (!this.liveInfo.players) this.liveInfo.players = {};

    if (player) {
      this.liveInfo.players[login] = player;
    } else {
      delete this.liveInfo.players[login];
    }
  }

  reverseCupGetPlayerStatus(login: string): PlayerStatus {
    if (!this.isReverseCup) {
      return { spectator: false, eliminated: false, lastChance: false };
    }

    const round = this.liveInfo.players?.[login];
    const points = round?.matchPoints ?? -1;

    return {
      spectator: round?.matchPoints === -10000,
      eliminated: isEliminated(points),
      lastChance: isLastChance(points),
    };
  }

  reverseCupGetPointsRepartition(nbPlayers: number): number[] {
    const map = this.liveInfo.pointsRepartitionMap;
    let repartition =
      map && map[nbPlayers] ? map[nbPlayers] : this.liveInfo.pointsRepartition;

    if (
      this.liveInfo.fastForwardPointsRepartition &&
      nbPlayers > repartition.length
    ) {
      for (const round of Object.values(this.liveInfo.players || {})) {
        if (nbPlayers <= repartition.length) break;

        const points = round.matchPoints;
        if (points > -10000 && points <= -2000) {
          repartition = repartition.slice(1);
        }
      }
    }

    return repartition;
  }

  isRacing(player: Pick<SPlayerInfo, "Login" | "SpectatorStatus">): boolean {
    return (
      player.SpectatorStatus === 0 &&
      !this.reverseCupGetPlayerStatus(player.Login).spectator
    );
  }

  // Fresh waypoint for a player at the start of a round
  newRoundWaypoint(
    login: string,
    flags: "computed" | "fromRound" = "computed",
  ): PlayerWaypoint {
    const round = this.liveInfo.players[login];

    if (flags === "fromRound") {
      return {
        login,
        accountId: round?.accountId ?? "",
        time: 0,
        hasFinished: false,
        hasGivenUp: false,
        isFinalist: round?.finalist ?? false,
        isLastChance: round?.lastChance ?? false,
        isEliminated: round?.eliminated ?? false,
        checkpoint: 0,
      };
    }

    return {
      login,
      accountId: round?.accountId ?? "",
      time: 0,
      hasFinished: false,
      hasGivenUp: false,
      isFinalist: isFinalist(round?.matchPoints, this.liveInfo.pointsLimit),
      isLastChance: this.isReverseCup && isLastChance(round?.matchPoints),
      isEliminated: this.isReverseCup && isEliminated(round?.matchPoints),
      checkpoint: 0,
    };
  }

  // Rebuilds the active round from the current player list
  resetActiveRound(
    playerList: SPlayerInfo[],
    flags: "computed" | "fromRound" = "computed",
  ): void {
    this.liveInfo.activeRound = { players: {} };

    for (const player of playerList) {
      if (!this.isRacing(player)) continue;
      this.setActiveRoundPlayer(
        player.Login,
        this.newRoundWaypoint(player.Login, flags),
      );
    }
  }

  applyScriptSettings(parsed: ParsedScriptSettings): void {
    this.liveInfo.pointsLimit = parsed.pointsLimit;
    this.liveInfo.roundsLimit = parsed.roundsLimit;
    this.liveInfo.mapLimit = parsed.mapLimit;
    this.liveInfo.nbWinners = parsed.nbWinners;
    this.liveInfo.fastForwardPointsRepartition =
      parsed.fastForwardPointsRepartition;

    if (parsed.pointsRepartitionMap) {
      this.liveInfo.pointsRepartitionMap = parsed.pointsRepartitionMap;
    }
    if (parsed.pointsRepartition) {
      this.liveInfo.pointsRepartition = parsed.pointsRepartition;
    }
  }
}
