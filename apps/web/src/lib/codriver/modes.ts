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
  warmups: "S_WarmUpNb",
  "warm ups": "S_WarmUpNb",
  "number of warmups": "S_WarmUpNb",
  "warmup time": "S_WarmUpDuration",
  "complex points repartition": "S_ComplexPointsRepartition",
  "complex repartition": "S_ComplexPointsRepartition",
  "dnf penalty": "S_DNF_LossPoints",
  "dnf points": "S_DNF_LossPoints",
  "dnf loss points": "S_DNF_LossPoints",
};

export function resolveSetting(script: string, name: string): ModeSetting {
  const settings = modeSettings(script);
  if (!settings) {
    throw new CodriverError(
      `Codriver can't change the settings of ${modeKey(script)}.`,
    );
  }
  return resolveSettingIn(settings, modeKey(script), name);
}

// "S_WarmUpNb" -> "Warm Up Nb", so words in a request can match it
function settingWords(name: string): string {
  return name
    .replace(/^S_/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ");
}

// Finds a setting by name, alias or description among `settings` of the mode `label`
export function resolveSettingIn(
  settings: ModeSetting[],
  label: string,
  name: string,
): ModeSetting {
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
  // Any DNF penalty wording means the points a DNF costs, not the last chance DNF mode
  if (/dnf/i.test(name) && !/mode|chance/i.test(name)) {
    const dnf = byName("S_DNF_LossPoints");
    if (dnf) return dnf;
  }

  const found = fuzzyFind(
    name,
    settings,
    (setting) => `${settingWords(setting.name)} ${setting.description}`,
  );
  if (found.kind === "match") return found.item;
  if (found.kind === "ambiguous") {
    throw new CodriverError(
      `"${name}" could mean ${found.items.map((s) => s.name).join(", ")}. Which one?`,
    );
  }
  throw new CodriverError(`${label} has no setting "${name}".`);
}

const durationUnits: Record<string, number> = {
  s: 1,
  sec: 1,
  secs: 1,
  second: 1,
  seconds: 1,
  m: 60,
  min: 60,
  mins: 60,
  minute: 60,
  minutes: 60,
  h: 3600,
  hr: 3600,
  hrs: 3600,
  hour: 3600,
  hours: 3600,
};

// "30s" or "4 hours" for settings counted in seconds
function durationSeconds(text: string): number | null {
  const match = /^(\d+(?:\.\d+)?)\s*([a-z]+)$/i.exec(text);
  if (!match) return null;
  const unit = durationUnits[match[2].toLowerCase()];
  return unit ? Math.round(Number(match[1]) * unit) : null;
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
      const value = /Duration|Time/.test(setting.name)
        ? (durationSeconds(text) ?? Number(text))
        : Number(text);
      if (Number.isInteger(value) && Math.abs(value) <= 1_000_000) return value;
      break;
    }
    case "float": {
      const value = Number(text);
      if (Number.isFinite(value) && Math.abs(value) <= 1_000_000) return value;
      break;
    }
    case "string":
      // ManiaScript strings can't contain the triple quote that delimits them
      if (text.length <= 200 && !text.includes('"""')) {
        if (/Complex.*Repartition/.test(setting.name) && text)
          return complexRepartition(text, setting.name);
        return text;
      }
      break;
  }
  throw new CodriverError(
    `"${text}" is not a valid value for ${setting.name} (${setting.type}).`,
  );
}

// {"2": [4, 8], "3,4": [0, 4, 10]}: points per number of players, normalized to compact JSON
function complexRepartition(text: string, name: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  const valid =
    !!parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    Object.entries(parsed).every(
      ([key, points]) =>
        /^\d+(\s*,\s*\d+)*$/.test(key) &&
        Array.isArray(points) &&
        points.every((point) => Number.isInteger(point)),
    );
  if (!valid)
    throw new CodriverError(
      `${name} needs JSON such as {"3": [2, 6, 10]}: points per number of players.`,
    );
  return JSON.stringify(parsed);
}

export type SettingInput = { name: string; value: string | number | boolean };

// Validates and converts settings by name for a script
export function resolveSettings(
  script: string,
  settings: SettingInput[],
): Record<string, string | number | boolean> {
  const known = modeSettings(script);
  if (!known) {
    throw new CodriverError(
      `Codriver can't change the settings of ${modeKey(script)}.`,
    );
  }
  return resolveSettingsIn(known, modeKey(script), settings);
}

export function resolveSettingsIn(
  known: ModeSetting[],
  label: string,
  settings: SettingInput[],
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const entry of settings) {
    const setting = resolveSettingIn(known, label, entry.name);
    result[setting.name] = coerceSetting(setting, entry.value);
  }
  return result;
}

// The #Setting lines of a custom mode script, for scripts the panel has no description of
export function parseScriptSettings(source: string): ModeSetting[] {
  const settings: ModeSetting[] = [];
  const line =
    /^#Setting\s+(S_\w+)\s+("""[\s\S]*?"""|"(?:[^"\\]|\\.)*"|\S+)(?:\s+as\s+(?:_\()?"((?:[^"\\]|\\.)*)")?/gm;
  for (const [, name, raw, description = ""] of source.matchAll(line)) {
    if (settings.some((setting) => setting.name === name)) continue;
    const quoted = raw.startsWith('"');
    const value = raw.replace(/^"""|"""$/g, "").replace(/^"|"$/g, "");
    const type = quoted
      ? "string"
      : /^(true|false)$/i.test(raw)
        ? "boolean"
        : /^-?\d+$/.test(raw)
          ? "int"
          : /^-?\d*\.\d+$/.test(raw)
            ? "float"
            : null;
    if (type) settings.push({ name, description, type, default: value });
  }
  return settings;
}
