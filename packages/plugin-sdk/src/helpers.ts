import type {
  MapInfoMinimal,
  ScoresPlayer,
  SMapInfo,
  SpectatorStatus,
} from "./game-types";
import type { PluginContext } from "./types";

// Helpers for plugins. They run inside the sandbox, so they use plain JavaScript only.

// SpectatorStatus from GetPlayerInfo is a decimal bit field
export function getSpectatorStatus(spectatorStatus: number): SpectatorStatus {
  return {
    spectator: spectatorStatus % 10 === 1,
    temporarySpectator: Math.floor(spectatorStatus / 10) % 10 === 1,
    pureSpectator: Math.floor(spectatorStatus / 100) % 10 === 1,
    autoTarget: Math.floor(spectatorStatus / 1000) % 10 === 1,
    currentTargetId: Math.floor(spectatorStatus / 10000),
  };
}

// Orders players by race time (DNF last), tie-broken by checkpoints from last to first
export function rankPlayers(
  players: ScoresPlayer[],
  timeAttack?: boolean,
): (ScoresPlayer & { position: number })[] {
  return [...players]
    .sort((a, b) => {
      const timeA = timeAttack ? a.bestracetime : a.prevracetime;
      const timeB = timeAttack ? b.bestracetime : b.prevracetime;

      if (timeA === -1 && timeB === -1) return 0;
      if (timeA === -1) return 1;
      if (timeB === -1) return -1;
      if (timeA !== timeB) return timeA - timeB;

      const cpA = timeAttack ? a.bestracecheckpoints : a.prevracecheckpoints;
      const cpB = timeAttack ? b.bestracecheckpoints : b.prevracecheckpoints;
      for (let i = Math.min(cpA.length, cpB.length) - 1; i >= 0; i--) {
        if (cpA[i] !== cpB[i]) return cpA[i] - cpB[i];
      }
      return 0;
    })
    .map((player, index) => ({ ...player, position: index + 1 }));
}

export interface TeamColors {
  mainColor: string;
  secondaryColor: string;
  textColor: string;
}

const TEAM_COLORS: Record<string, TeamColors> = {
  red: { mainColor: "A22", secondaryColor: "922", textColor: "DDD" },
  blue: { mainColor: "22A", secondaryColor: "229", textColor: "DDD" },
  default: { mainColor: "", secondaryColor: "", textColor: "" },
};

// Colors for the Red and Blue teams of the team modes
export function getTeamColors(teamName?: string): TeamColors {
  if (!teamName) return TEAM_COLORS.default;
  return TEAM_COLORS[teamName.toLowerCase()] ?? TEAM_COLORS.default;
}

const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

// Logins are the url-safe base64 of the Ubisoft account id; fake players have no account
export function loginToAccountId(login: string): string | null {
  if (login.includes("fakeplayer") || !/^[A-Za-z0-9_-]{22}$/.test(login)) return null;

  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of login) {
    buffer = (buffer << 6) | BASE64URL.indexOf(char);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  if (bytes.length !== 16) return null;

  const hex = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function accountIdToLogin(accountId: string): string | null {
  const hex = accountId.replace(/-/g, "");
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) return null;

  let login = "";
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < 32; i += 2) {
    buffer = (buffer << 8) | parseInt(hex.slice(i, i + 2), 16);
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      login += BASE64URL[(buffer >> bits) & 0x3f];
    }
    buffer &= (1 << bits) - 1;
  }
  if (bits > 0) login += BASE64URL[(buffer << (6 - bits)) & 0x3f];
  return login;
}

// The server's map list. Reading needs "maps:read", changing it "maps:write".
export class MapList {
  constructor(private readonly ctx: PluginContext<any>) {}

  async getAll(): Promise<MapInfoMinimal[]> {
    const pageSize = 100;
    let all: MapInfoMinimal[] = [];
    for (let start = 0; ; start += pageSize) {
      const batch = await this.ctx.gbx.call<MapInfoMinimal[]>("GetMapList", pageSize, start);
      if (!Array.isArray(batch) || batch.length === 0) break;
      all = all.concat(batch);
      if (batch.length < pageSize) break;
    }
    if (all.length === 0) throw new Error("Failed to retrieve the map list from the server");
    return all;
  }

  // Unknown files are skipped
  async getInfos(fileNames: string[]): Promise<SMapInfo[]> {
    const infos: SMapInfo[] = [];
    for (const fileName of fileNames) {
      try {
        const info = await this.ctx.gbx.call<SMapInfo | undefined>("GetMapInfo", fileName);
        if (info) infos.push(info);
      } catch (error) {
        this.ctx.log.warn(`Failed to get map info for ${fileName}`, { error: String(error) });
      }
    }
    return infos;
  }

  // Makes the map list exactly fileNames, in that order
  async replace(fileNames: string[]): Promise<void> {
    await this.ctx.gbx.call("RemoveMapList", fileNames);
    const added = await this.ctx.gbx.call("AddMapList", fileNames);
    if (typeof added !== "number") throw new Error("Failed to add maps to the map list");

    const others = (await this.getAll())
      .map((map) => map.FileName)
      .filter((fileName) => !fileNames.includes(fileName));
    const removed = await this.ctx.gbx.call("RemoveMapList", others);
    if (typeof removed !== "number") throw new Error("Failed to remove maps from the map list");
  }

  async jumpTo(index: number): Promise<void> {
    await this.ctx.gbx.call("JumpToMapIndex", index);
  }

  async restart(): Promise<void> {
    await this.ctx.gbx.call("RestartMap");
  }
}

// Runs fn right away, then at most once per ms however often it is called. Live widgets
// use it so a burst of checkpoints doesn't send a page for every single one.
export function throttle(ctx: PluginContext<any>, fn: () => void, ms: number): () => void {
  let waiting = false;
  let pending = false;

  const run = () => {
    fn();
    waiting = true;
    ctx.setTimeout(() => {
      waiting = false;
      if (pending) {
        pending = false;
        run();
      }
    }, ms);
  };

  return () => {
    if (waiting) pending = true;
    else run();
  };
}
