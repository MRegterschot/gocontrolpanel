export type PickAndBanOrderItem =
  | { action: "pick"; seed: number }
  | { action: "ban"; seed: number }
  | { action: "random" };

// "b:1,b:2,p:2,p:1,r" as stored by the panel's match settings form
export function stringToPickAndBan(str?: string): PickAndBanOrderItem[] {
  if (!str) return [];

  return str.split(",").map((item) => {
    const [action, seed] = item.trim().split(":");
    if (action === "p") return { action: "pick", seed: parseInt(seed, 10) };
    if (action === "b") return { action: "ban", seed: parseInt(seed, 10) };
    if (action === "r") return { action: "random" };
    throw new Error(`Invalid pick and ban item: ${item}`);
  });
}

export type PickBanMode = "player" | "team";

export interface PickBanMap {
  name: string;
  author: string;
  uid: string;
  filename: string;
  // 1-based position in the final map list once picked
  index: number;
  // Team mode: logins currently voting for this map
  selectedBy: string[];
  pickedBy: string;
  bannedBy: string;
}

export interface PickBanTurn {
  action: "pick" | "ban" | "random";
  // Player mode: whose turn it is ("" when the seed has no player)
  login: string;
  // Team mode: who may vote
  players: string[];
  nickName: string;
  timeoutSeconds?: number;
}

export interface PickBanSetup {
  mode: PickBanMode;
  order: PickAndBanOrderItem[];
  choosePosition: boolean;
  players: { login: string; seed: number }[];
  teams: { seed: number; name?: string; players: string[] }[];
  maps: PickBanMap[];
}

export type SelectResult =
  | { kind: "noTurn" }
  | { kind: "notYourTurn" }
  | { kind: "mapNotFound" }
  | { kind: "mapUnavailable" }
  // Player picked and must now choose the map's position
  | { kind: "choosePosition" }
  // Team vote registered, majority not reached yet
  | { kind: "voteRegistered" }
  | { kind: "applied"; map: PickBanMap };

// Swaps the seeds in the order for /setseeds: the n-th lowest seed becomes seeds[n]
export function applySeedsOverride(
  order: PickAndBanOrderItem[],
  seeds: number[],
): PickAndBanOrderItem[] {
  if (seeds.length === 0) return order;

  const uniqueSeeds = [
    ...new Set(order.flatMap((item) => (item.action === "random" ? [] : [item.seed]))),
  ].sort((a, b) => a - b);

  const replacements = new Map<number, number>();
  seeds.forEach((seed, i) => {
    if (i < uniqueSeeds.length) replacements.set(uniqueSeeds[i], seed);
  });

  return order.map((item) =>
    item.action === "random"
      ? item
      : { ...item, seed: replacements.get(item.seed) ?? item.seed },
  );
}

// Positions 1..n, one per pick or random step
export function availablePositions(order: PickAndBanOrderItem[]): number[] {
  return order
    .filter((item) => item.action === "pick" || item.action === "random")
    .map((_, i) => i + 1);
}

export class PickBan {
  readonly mode: PickBanMode;
  readonly choosePosition: boolean;
  readonly maps: PickBanMap[];
  readonly positionsAvailable: number[];
  private readonly order: PickAndBanOrderItem[];
  private readonly players: PickBanSetup["players"];
  private readonly teams: PickBanSetup["teams"];
  private readonly picked = new Map<number, string>();
  private currentIndex = 0;
  private turn: PickBanTurn | null;
  // Map waiting for its position (choosePosition mode)
  private pendingMapUid: string | null = null;

  constructor(
    setup: PickBanSetup,
    private readonly nickNameOf: (login: string) => string | undefined,
    private readonly random: () => number = Math.random,
  ) {
    this.mode = setup.mode;
    this.choosePosition = setup.choosePosition;
    this.maps = setup.maps;
    this.order = setup.order;
    this.players = setup.players;
    this.teams = setup.teams;
    this.positionsAvailable = availablePositions(setup.order);
    this.turn = this.computeTurn();
  }

  get currentTurn(): PickBanTurn | null {
    return this.turn;
  }

  get isDone(): boolean {
    return this.currentIndex >= this.maps.length || this.turn === null;
  }

  // Final map list in position order
  pickedFileNames(): string[] {
    return [...this.picked.entries()].sort(([a], [b]) => a - b).map(([, file]) => file);
  }

  advance(): PickBanTurn | null {
    this.currentIndex += 1;
    this.pendingMapUid = null;
    this.turn = this.computeTurn();
    return this.turn;
  }

  select(login: string, uid: string, activeLogins: string[]): SelectResult {
    const turn = this.turn;
    if (!turn) return { kind: "noTurn" };

    if (this.mode === "player" && turn.login !== login) return { kind: "notYourTurn" };
    if (this.mode === "team" && !turn.players.includes(login)) return { kind: "notYourTurn" };

    const map = this.maps.find((m) => m.uid === uid);
    if (!map) return { kind: "mapNotFound" };
    if (map.pickedBy || map.bannedBy) return { kind: "mapUnavailable" };

    if (this.mode === "team") {
      if (!map.selectedBy.includes(login)) map.selectedBy.push(login);
      for (const other of this.maps) {
        if (other !== map && !other.pickedBy && !other.bannedBy) {
          other.selectedBy = other.selectedBy.filter((l) => l !== login);
        }
      }

      const votes = map.selectedBy.filter((l) => turn.players.includes(l)).length;
      const activeTeamPlayers = activeLogins.filter((l) => turn.players.includes(l)).length;
      if (votes <= activeTeamPlayers / 2) return { kind: "voteRegistered" };
    } else if (turn.action === "pick" && this.choosePosition) {
      this.pendingMapUid = map.uid;
      return { kind: "choosePosition" };
    }

    if (turn.action === "pick") {
      this.pickAt(map, turn.nickName, this.picked.size + 1);
    } else if (turn.action === "ban") {
      map.bannedBy = turn.nickName;
    }

    return { kind: "applied", map };
  }

  // Completes a choosePosition pick; false when the position is not available
  choosePositionFor(position: number): PickBanMap | null {
    const turn = this.turn;
    const map = this.maps.find((m) => m.uid === this.pendingMapUid);
    const slot = this.positionsAvailable.indexOf(position);
    if (!turn || !map || slot === -1) return null;

    this.positionsAvailable.splice(slot, 1);
    this.pickAt(map, turn.nickName, position);
    this.pendingMapUid = null;
    return map;
  }

  // Explicit "random" step: always a pick, by "random"
  pickRandom(): PickBanMap | null {
    const map = this.randomAvailableMap();
    if (!map) return null;
    this.pickAt(map, "random", this.nextAutoPosition());
    return map;
  }

  // Timed-out turn: apply the turn's own action to a random map on the player's behalf
  resolveTimeout(): PickBanMap | null {
    const turn = this.turn;
    if (!turn) return null;

    const map = this.randomAvailableMap();
    if (!map) return null;

    if (turn.action === "ban") {
      map.bannedBy = turn.nickName;
    } else {
      this.pickAt(map, turn.nickName, this.nextAutoPosition());
    }
    return map;
  }

  private pickAt(map: PickBanMap, by: string, position: number) {
    this.picked.set(position - 1, map.filename);
    map.pickedBy = by;
    map.index = position;
  }

  private nextAutoPosition(): number {
    if (this.mode === "player" && this.choosePosition) {
      const next = this.positionsAvailable.shift();
      if (next !== undefined) return next;
    }
    return this.picked.size + 1;
  }

  private randomAvailableMap(): PickBanMap | null {
    const available = this.maps.filter((m) => !m.pickedBy && !m.bannedBy);
    if (available.length === 0) return null;
    return available[Math.floor(this.random() * available.length)] ?? null;
  }

  private computeTurn(): PickBanTurn | null {
    const step = this.order[this.currentIndex];
    if (!step) return null;

    if (step.action === "random") {
      return { action: "random", login: "", players: [], nickName: "" };
    }

    if (this.mode === "player") {
      const player = this.players.find((p) => p.seed === step.seed);
      if (!player) return { action: step.action, login: "", players: [], nickName: "" };
      return {
        action: step.action,
        login: player.login,
        players: [],
        nickName: this.nickNameOf(player.login) || player.login,
      };
    }

    const team = this.teams.find((t) => t.seed === step.seed);
    if (!team) return { action: step.action, login: "", players: [], nickName: "" };
    return {
      action: step.action,
      login: "",
      players: team.players,
      nickName: team.name || `Team ${step.seed}`,
    };
  }
}
