import { gameModesScripts, getGameModeByScript } from "@/lib/scripts";
import { fuzzyFind, normalize } from "./text";
import { CodriverError } from "./types";

// "Trackmania/TM_Cup_Online.Script.txt" -> "Cup"
export function modeKey(script: string): string {
  return /TM_(\w+?)_Online/.exec(script)?.[1] ?? script;
}

export const modeKeys = gameModesScripts.map(modeKey) as [string, ...string[]];

export function scriptForMode(key: string): string | undefined {
  const wanted = key.toLowerCase();
  return gameModesScripts.find(
    (script) => modeKey(script).toLowerCase() === wanted,
  );
}

export interface ModeSetting {
  name: string;
  description: string;
  type: "int" | "float" | "boolean" | "string";
  default: string;
}

// Settings the panel knows for a script, without the ones Nadeo marks hidden
export function modeSettings(script: string): ModeSetting[] | null {
  const mode = getGameModeByScript(script);
  if (!mode) return null;
  return mode.ParamDescs.filter((param) => param.Desc !== "<hidden>").map(
    (param) => ({
      name: param.Name,
      description: param.Desc,
      type:
        param.Type === "double"
          ? "float"
          : (param.Type as "int" | "float" | "boolean" | "string"),
      default: param.Default,
    }),
  );
}

// Common phrasings that don't match the setting's own description well
const aliases: Record<string, string> = {
  "points limit": "S_PointsLimit",
  "point limit": "S_PointsLimit",
  points: "S_PointsLimit",
  "time limit": "S_TimeLimit",
  time: "S_TimeLimit",
  rounds: "S_RoundsPerMap",
  "rounds per map": "S_RoundsPerMap",
  "maps per match": "S_MapsPerMatch",
  warmup: "S_WarmUpNb",
  "warm up": "S_WarmUpNb",
  "warmup rounds": "S_WarmUpNb",
  "warmup duration": "S_WarmUpDuration",
  "finish timeout": "S_FinishTimeout",
  winners: "S_NbOfWinners",
  "number of winners": "S_NbOfWinners",
  laps: "S_ForceLapsNb",
};

export function resolveSetting(script: string, name: string): ModeSetting {
  const settings = modeSettings(script);
  if (!settings) {
    throw new CodriverError(
      `Codriver can't change the settings of ${modeKey(script)}.`,
    );
  }

  const wanted = name.trim().toLowerCase();
  const byName = (settingName: string) =>
    settings.find(
      (setting) => setting.name.toLowerCase() === settingName.toLowerCase(),
    );

  const direct =
    byName(wanted) ??
    byName(`s_${wanted}`) ??
    byName(aliases[normalize(name)] ?? "");
  if (direct) return direct;

  const found = fuzzyFind(
    name,
    settings,
    (setting) => `${setting.description} ${setting.name.replace(/^S_/, "")}`,
  );
  if (found.kind === "match") return found.item;
  if (found.kind === "ambiguous") {
    throw new CodriverError(
      `"${name}" could mean ${found.items.map((s) => s.name).join(", ")}. Which one?`,
    );
  }
  throw new CodriverError(`${modeKey(script)} has no setting "${name}".`);
}

const truthy = new Set(["true", "on", "yes", "1", "enabled", "enable"]);
const falsy = new Set(["false", "off", "no", "0", "disabled", "disable"]);

export function coerceSetting(
  setting: ModeSetting,
  raw: string | number | boolean,
): string | number | boolean {
  const text = String(raw).trim();
  switch (setting.type) {
    case "boolean": {
      const lower = text.toLowerCase();
      if (truthy.has(lower)) return true;
      if (falsy.has(lower)) return false;
      break;
    }
    case "int": {
      const value = Number(text);
      if (Number.isInteger(value) && Math.abs(value) <= 1_000_000) return value;
      break;
    }
    case "float": {
      const value = Number(text);
      if (Number.isFinite(value) && Math.abs(value) <= 1_000_000) return value;
      break;
    }
    case "string":
      if (text.length <= 200) return text;
      break;
  }
  throw new CodriverError(
    `"${text}" is not a valid value for ${setting.name} (${setting.type}).`,
  );
}

// Validates and converts settings by name for a script
export function resolveSettings(
  script: string,
  settings: { name: string; value: string | number | boolean }[],
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const entry of settings) {
    const setting = resolveSetting(script, entry.name);
    result[setting.name] = coerceSetting(setting, entry.value);
  }
  return result;
}
