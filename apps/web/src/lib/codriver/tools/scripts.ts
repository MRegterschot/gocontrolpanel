import {
  listModeScriptsAs,
  readFileTextAs,
  writeFileTextAs,
} from "@/actions/filemanager/server-only/files";
import { gameModesScripts, generateScript } from "@/lib/scripts";
import { GAME_MODE_TYPES, type GameModeType } from "@gcp/shared";
import "server-only";
import { z } from "zod/v4";
import {
  modeKey,
  type ModeSetting,
  modeSettings,
  parseScriptSettings,
  resolveSettingsIn,
} from "../modes";
import { chatSafe, fuzzyFind, normalize } from "../text";
import { CodriverError, defineTool, type ToolContext } from "../types";

const MODES_DIR = "Scripts/Modes";
const SCRIPT_SUFFIX = /\.Script\.txt$/i;

// The script a bare mode name starts from when the server has it, over other scripts of
// that type such as the default reverse cup
const preferredScripts: Partial<Record<GameModeType, string>> = {
  reversecup: "TM_ReverseCupGCP.Script.txt",
};

// Short names players use for the Nadeo modes
const modeAliases: Record<string, string> = {
  ta: "TimeAttack",
  ko: "Knockout",
  rta: "RoyalTimeAttack",
  tmwc: "TMWC2023",
  tmwt: "TMWTTeams",
};

// "BNL/TM_ReverseCupGCP_BNL.Script.txt" -> "BNL Reverse Cup GCP BNL"
export function scriptWords(path: string): string {
  return path
    .replace(SCRIPT_SUFFIX, "")
    .replace(/(^|\/)TM_/g, "$1")
    .replace(/_Online$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[/_]/g, " ");
}

// "the reverse cup mode script" -> "reverse cup"
function cleanQuery(query: string): string {
  return (
    query
      .replace(SCRIPT_SUFFIX, "")
      .replace(/\b(the|a|an|game ?mode|mode|scripts?)\b/gi, " ")
      .trim() || query
  );
}

// The type TMControlPanel detects from a script name, as the GBX service does
export function detectModeType(script: string): GameModeType | undefined {
  const lower = script.toLowerCase();
  return GAME_MODE_TYPES.find((type) => lower.includes(type));
}

function nadeoScript(query: string): string | undefined {
  const exact = gameModesScripts.find(
    (script) => script.toLowerCase() === query.toLowerCase(),
  );
  if (exact) return exact;
  const compact = normalize(cleanQuery(query)).replace(/ /g, "");
  const key = (modeAliases[compact] ?? compact).toLowerCase();
  return gameModesScripts.find(
    (script) => modeKey(script).toLowerCase() === key,
  );
}

const baseName = (path: string) => path.split("/").at(-1)!;

// Of several similar scripts, the one the others extend by name: "Reverse Cup GCP" over
// "Reverse Cup GCP League". Top-level files win from copies in folders.
function rootScript(paths: string[]): string | undefined {
  const words = (path: string) => normalize(scriptWords(baseName(path)));
  const roots = paths.filter((path) =>
    paths.every((other) => words(other).startsWith(words(path))),
  );
  return roots.find((path) => !path.includes("/")) ?? roots[0];
}

// A mode script on the server, by exact path or by name. `preferRoot` resolves a near tie
// to the script the others are named after, for picking a script to start from.
export async function findServerScript(
  ctx: ToolContext,
  query: string,
  preferRoot = false,
): Promise<string> {
  const nadeo = nadeoScript(query);
  if (nadeo && preferRoot) return nadeo;
  const scripts = await listModeScriptsAs(ctx.actor, ctx.serverId);
  const exact =
    scripts.find((script) => script === query) ??
    scripts.find((script) => script.toLowerCase() === query.toLowerCase()) ??
    scripts.find(
      (script) => script.toLowerCase() === `${query.toLowerCase()}.script.txt`,
    );
  if (exact) return exact;
  const type = normalize(cleanQuery(query)).replace(/ /g, "") as GameModeType;
  const preferred = preferRoot ? preferredScripts[type] : undefined;
  if (preferred && scripts.includes(preferred)) return preferred;
  if (nadeo) {
    // "the timeattack script" may mean a generated one; never guess between them
    const compact = (text: string) => normalize(text).replace(/ /g, "");
    const wanted = compact(modeKey(nadeo));
    const similar = scripts.filter((script) =>
      compact(scriptWords(script)).includes(wanted),
    );
    if (similar.length === 0) return nadeo;
    throw new CodriverError(
      `Which script: ${[nadeo, ...similar.slice(0, 4)].map((s) => chatSafe(s, 60)).join(", ")}?`,
    );
  }

  const found = fuzzyFind(cleanQuery(query), scripts, scriptWords);
  if (found.kind === "match") return found.item;
  if (found.kind === "ambiguous") {
    const root = preferRoot ? rootScript(found.items) : undefined;
    if (root) return root;
    throw new CodriverError(
      `Which script: ${found.items.map((s) => chatSafe(s, 60)).join(", ")}?`,
    );
  }
  throw new CodriverError(`No mode script matches "${chatSafe(query, 40)}".`);
}

// The settings a script can be generated with: the panel's list for Nadeo modes, the
// script's own #Setting lines otherwise
async function baseSettings(
  ctx: ToolContext,
  script: string,
): Promise<ModeSetting[]> {
  const known = modeSettings(script);
  if (known) return known;
  const source = await readFileTextAs(
    ctx.actor,
    ctx.serverId,
    `${MODES_DIR}/${script}`,
  );
  return parseScriptSettings(source);
}

// One folder or file name: no separators, dots only inside
function cleanSegment(segment: string): string {
  return segment
    .replace(/[^\w .()-]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 60);
}

function cleanFolder(folder: string | undefined): string {
  const segments = (folder ?? "")
    .split(/[\\/]+/)
    .map(cleanSegment)
    .filter(Boolean);
  if (segments.length > 3)
    throw new CodriverError("Use a folder at most 3 levels deep.");
  return segments.join("/");
}

// Where a script is stored, relative to Scripts/Modes
export function targetPath(
  base: string,
  name: string | undefined,
  folder: string | undefined,
): string {
  const dir = cleanFolder(folder);
  const stem = name
    ? cleanSegment(name.replace(SCRIPT_SUFFIX, ""))
    : `${baseName(base)
        .replace(SCRIPT_SUFFIX, "")
        .replace(/_Online$/, "")}_${dir.split("/").at(-1) || "Custom"}`;
  if (!stem) throw new CodriverError("That script name has no usable letters.");
  return `${dir ? `${dir}/` : ""}${stem}.Script.txt`;
}

function describe(settings: Record<string, string | number | boolean>): string {
  return Object.entries(settings)
    .map(([name, value]) => `${name} ${chatSafe(String(value), 60)}`)
    .join(", ");
}

const settingsInput = z
  .array(
    z.strictObject({
      name: z.string().min(1).max(60),
      value: z.union([z.string().max(200), z.number(), z.boolean()]),
    }),
  )
  .max(15);

const generateInput = z.strictObject({
  mode: z
    .string()
    .min(1)
    .max(200)
    .describe(
      "The mode or existing script to start from, as the player said it, such as reverse cup or TimeAttack",
    ),
  name: z
    .string()
    .min(1)
    .max(80)
    .optional()
    .describe("File name, only when the player gave one"),
  folder: z
    .string()
    .min(1)
    .max(200)
    .optional()
    .describe(
      "Folder under Scripts/Modes, only when the player named one; created when missing",
    ),
  settings: settingsInput
    .optional()
    .describe(
      "Every setting the player mentioned; durations as written (30s, 4 hours) or in seconds",
    ),
});

async function plan(ctx: ToolContext, input: z.output<typeof generateInput>) {
  const base = await findServerScript(ctx, input.mode, true);
  const known = await baseSettings(ctx, base);
  if (input.settings?.length && known.length === 0)
    throw new CodriverError(
      `Codriver can't read the settings of ${chatSafe(base, 60)}.`,
    );
  const settings = input.settings?.length
    ? resolveSettingsIn(known, scriptWords(baseName(base)), input.settings)
    : {};
  const path = targetPath(base, input.name, input.folder);
  return { base, known, settings, path };
}

export const generateScriptTool = defineTool({
  name: "generate_script",
  description:
    "Create or generate a mode script file with the script generator: it extends a mode or an existing script with the given settings. Saved in Scripts/Modes, or in the folder the player named.",
  category: "mode",
  minRole: "admin",
  input: generateInput,
  // Pins the base script and file name, so a confirmed call writes what was shown
  async prepare(ctx, input) {
    const { base, path } = await plan(ctx, input);
    return {
      ...input,
      mode: base,
      name: baseName(path),
      folder: path.includes("/")
        ? path.slice(0, path.lastIndexOf("/"))
        : undefined,
    };
  },
  async confirm(ctx, input) {
    const { path } = await plan(ctx, input);
    const scripts = await listModeScriptsAs(ctx.actor, ctx.serverId);
    return scripts.includes(path)
      ? `${chatSafe(path, 80)} already exists. Overwrite it?`
      : null;
  },
  async run(ctx, input) {
    const { base, known, settings, path } = await plan(ctx, input);
    const types = Object.fromEntries(known.map((s) => [s.name, s.type]));
    const content = generateScript(
      base,
      Object.fromEntries(
        Object.entries(settings).map(([name, value]) => [
          name,
          { value, type: types[name] },
        ]),
      ),
    );
    await writeFileTextAs(
      ctx.actor,
      ctx.serverId,
      `${MODES_DIR}/${path}`,
      content,
    );

    const wanted = detectModeType(base);
    const detected = detectModeType(baseName(path));
    const note =
      wanted && detected !== wanted
        ? ` Its name doesn't contain "${wanted}", so TMControlPanel will treat it as ${detected ?? "rounds"}.`
        : "";
    const detail = Object.keys(settings).length
      ? ` with ${describe(settings)}`
      : "";
    return {
      reply: `Created ${chatSafe(path, 80)} from ${chatSafe(modeKey(base), 60)}${detail}.${note}`,
    };
  },
});

export const scriptTools = [generateScriptTool];
