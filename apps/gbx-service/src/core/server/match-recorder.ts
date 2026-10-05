import type { Scores, Waypoint } from "@tmcp/shared";
import type { GbxConnection } from "../gbx/connection";
import type { LiveState } from "../live/live-state";
import type { Logger } from "../logger";
import type {
  MatchRepository,
  RecordInput,
  RecordRepository,
  UserRepository,
} from "../ports";
import { fetchPlayerInfo } from "./players";

export interface MatchRecorderDeps {
  serverId: string;
  state: LiveState;
  gbx: GbxConnection;
  matches: MatchRepository;
  records: RecordRepository;
  users: UserRepository;
  log: Logger;
}

// Persists matches, finishes and round results for the current map
export class MatchRecorder {
  constructor(private readonly deps: MatchRecorderDeps) {}

  async startMatch(mode: string): Promise<void> {
    const { state, log } = this.deps;
    const map = state.activeMapRecord;

    if (!map) {
      // Records are still stored without a match; failing the connect over this helps nobody
      log.error("No active map, match not created");
      state.currentMatchId = null;
      return;
    }

    const match = await this.deps.matches.create({
      serverId: this.deps.serverId,
      mapId: map.id,
      mode,
    });
    state.currentMatchId = match.id;
  }

  async recordFinish(waypoint: Waypoint): Promise<void> {
    const round = this.claimRound();
    if (round === false) return;

    await this.save({
      ...this.base(waypoint.login, round),
      time: waypoint.racetime,
      checkpoints: waypoint.curracecheckpoints || [],
    });
  }

  async recordRound(scores: Scores): Promise<void> {
    const round = this.claimRound();
    if (round === false) return;

    for (const player of scores.players) {
      await this.save({
        ...this.base(player.login, round),
        time: player.prevracetime,
        checkpoints: player.prevracecheckpoints || [],
        points: player.roundpoints,
      });
    }
  }

  // Returns the round to store, or false when nothing should be recorded (warm-up/pause)
  private claimRound(): number | null | false {
    const { state } = this.deps;
    if (state.liveInfo.isWarmUp || state.liveInfo.isPaused) return false;
    if (!state.activeMapRecord) {
      this.deps.log.error("No active map, record not saved");
      return false;
    }

    // A finish before the first StartRound belongs to round 1
    if (state.roundNumber === 0) state.roundNumber = 1;
    return state.roundNumber;
  }

  private base(login: string, round: number | null) {
    const map = this.deps.state.activeMapRecord!;
    return {
      serverId: this.deps.serverId,
      matchId: this.deps.state.currentMatchId,
      round,
      mapId: map.id,
      mapUid: map.uid,
      login,
    };
  }

  // A record can fail when the login has no users row yet; create it and retry once
  private async save(record: RecordInput): Promise<void> {
    const { records, log } = this.deps;
    try {
      await records.save(record);
      return;
    } catch (error) {
      log.warn({ err: error, login: record.login }, "Saving record failed, syncing player");
    }

    try {
      await this.ensureUser(record.login);
      await records.save(record);
    } catch (error) {
      log.error({ err: error, record }, "Failed to save record");
    }
  }

  private async ensureUser(login: string): Promise<void> {
    let nickName = login;
    try {
      nickName = (await fetchPlayerInfo(this.deps.gbx, login)).nickName;
    } catch {
      // Player may have left already; the login is a fine placeholder
    }
    await this.deps.users.ensureExists(login, nickName);
  }
}
