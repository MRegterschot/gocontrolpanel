import { listMapFilesAs } from "@/actions/filemanager/server-only/files";
import { saveServerPluginConfigAs } from "@/actions/server-only/plugins";
import { gbxService } from "@/lib/gbx-service";
import { storedManifest } from "@/services/plugins";
import { validatePluginConfig, type PluginConfig } from "@gcp/shared";
import "server-only";
import { z } from "zod/v4";
import { chatSafe, fuzzyFind, normalize } from "../text";
import { CodriverError, defineTool, type ToolContext } from "../types";
import { serverMaps } from "./map-list";
import { findPlugin, installedPlugins } from "./plugins";
import { findServerScript } from "./scripts";

const MATCH_SLUG = "match";

async function matchPlugin(ctx: ToolContext) {
  const plugin = (await installedPlugins(ctx.serverId)).find(
    (p) => p.slug === MATCH_SLUG,
  );
  if (!plugin)
    throw new CodriverError("The Match plugin isn't installed on this server.");
  return plugin;
}

const mapName = (file: string) =>
  file
    .split("/")
    .at(-1)!
    .replace(/\.(Map|Challenge)\.Gbx$/i, "");

interface MapSet {
  label: string;
  files: string[];
}

// "the BNL maps" -> the map files in the folder named most like BNL; "current" -> the map list
async function findMapSet(ctx: ToolContext, query: string): Promise<MapSet> {
  const cleaned = query
    .replace(/\b(the|all|maps?|tracks?|campaign|folder)\b/gi, " ")
    .trim();
  if (!cleaned || /^(current|map ?list)$/i.test(cleaned)) {
    const files = (await serverMaps(ctx.serverId)).map((map) => map.FileName);
    if (files.length === 0)
      throw new CodriverError("The server's map list is empty.");
    return { label: "the current map list", files };
  }
  const files = await listMapFilesAs(ctx.actor, ctx.serverId);
  const folders = new Map<string, string[]>();
  for (const file of files) {
    const folder = file.includes("/")
      ? file.slice(0, file.lastIndexOf("/"))
      : "";
    if (folder) folders.set(folder, [...(folders.get(folder) ?? []), file]);
  }
  const found = fuzzyFind(cleaned, [...folders.keys()], (folder) =>
    folder.replace(/^Downloaded\//i, ""),
  );
  if (found.kind === "match")
    return {
      label: found.item.split("/").at(-1)!,
      files: folders.get(found.item)!.sort(),
    };
  if (found.kind === "ambiguous")
    throw new CodriverError(
      `Which maps: ${found.items.map((f) => chatSafe(f, 50)).join(", ")}?`,
    );
  throw new CodriverError(
    `No map folder matches "${chatSafe(query, 40)}". Load the maps first.`,
  );
}

// A single map file: exact path, "random" from `pool`, "random <folder>", or a map name
async function findMap(
  ctx: ToolContext,
  query: string,
  pool: () => Promise<string[]>,
): Promise<string> {
  const random = /^\s*(a\s+)?random\b(.*)$/i.exec(query);
  if (random) {
    const rest = random[2].trim();
    const files = rest ? (await findMapSet(ctx, rest)).files : await pool();
    if (files.length === 0)
      throw new CodriverError("There are no maps to pick a lobby map from.");
    return files[Math.floor(Math.random() * files.length)];
  }
  const files = await listMapFilesAs(ctx.actor, ctx.serverId);
  if (files.includes(query)) return query;
  const found = fuzzyFind(query, files, mapName);
  if (found.kind === "match") return found.item;
  if (found.kind === "ambiguous")
    throw new CodriverError(
      `Which map: ${found.items.map((f) => chatSafe(mapName(f), 40)).join(", ")}?`,
    );
  throw new CodriverError(`No map matches "${chatSafe(query, 40)}".`);
}

const stepInput = z.strictObject({
  action: z.enum(["pick", "ban", "random"]),
  seed: z
    .number()
    .int()
    .min(1)
    .max(64)
    .optional()
    .describe("The player's or team's seed; leave out for random"),
});
type Step = z.output<typeof stepInput>;

// The plugin stores the order as "p:1,b:2,r"
function orderString(steps: Step[]): string {
  return steps
    .map((step) => {
      if (step.action === "random") return "r";
      if (!step.seed)
        throw new CodriverError(`Each ${step.action} step needs a seed.`);
      return `${step.action === "pick" ? "p" : "b"}:${step.seed}`;
    })
    .join(",");
}

const describeOrder = (steps: Step[]) =>
  steps
    .map((step) =>
      step.action === "random" ? "random" : `${step.action} ${step.seed}`,
    )
    .join(", ");

const matchInput = z.strictObject({
  script: z
    .string()
    .min(1)
    .max(200)
    .optional()
    .describe(
      "Match script: its file as named in an earlier reply, or the mode name",
    ),
  maps: z
    .string()
    .min(1)
    .max(80)
    .optional()
    .describe(
      "Maps the match plays: a map folder or campaign name, or current for the server's map list",
    ),
  pick_ban_type: z.enum(["player", "team"]).optional(),
  order: z
    .array(stepInput)
    .min(1)
    .max(30)
    .optional()
    .describe("Pick and ban steps in order"),
  lobby_script: z.string().min(1).max(200).optional(),
  lobby_map: z
    .string()
    .min(1)
    .max(200)
    .optional()
    .describe(
      "A map name, random for a random match map, or random <folder> for one from that folder",
    ),
});
type MatchInput = z.output<typeof matchInput>;

interface MatchChanges {
  config: PluginConfig;
  summary: string[];
}

async function matchChanges(
  ctx: ToolContext,
  input: MatchInput,
  config: PluginConfig,
): Promise<MatchChanges> {
  const next = structuredClone(config) as Record<string, any>;
  const summary: string[] = [];
  if (input.script) {
    next.script = await findServerScript(ctx, input.script);
    summary.push(`script ${chatSafe(next.script, 80)}`);
  }
  if (input.maps) {
    const set = await findMapSet(ctx, input.maps);
    next.maps = set.files;
    summary.push(`${set.files.length} maps from ${chatSafe(set.label, 50)}`);
  }
  if (input.pick_ban_type || input.order) {
    next.pickAndBan = { ...(next.pickAndBan ?? {}) };
    if (input.pick_ban_type) next.pickAndBan.type = input.pick_ban_type;
    if (input.order) {
      const maps: unknown[] = Array.isArray(next.maps) ? next.maps : [];
      if (input.order.length > maps.length)
        throw new CodriverError(
          `The order has ${input.order.length} steps but the match has ${maps.length} maps.`,
        );
      next.pickAndBan.order = orderString(input.order);
    }
    summary.push(
      `${input.pick_ban_type ?? next.pickAndBan.type ?? "player"} pick and ban${input.order ? ` (${describeOrder(input.order)})` : ""}`,
    );
  }
  if (input.lobby_script || input.lobby_map) {
    next.lobby = { ...(next.lobby ?? {}) };
    if (input.lobby_script) {
      next.lobby.script = await findServerScript(ctx, input.lobby_script);
      summary.push(`lobby script ${chatSafe(next.lobby.script, 80)}`);
    }
    if (input.lobby_map) {
      next.lobby.map = await findMap(ctx, input.lobby_map, async () =>
        Array.isArray(next.maps) ? next.maps : [],
      );
      summary.push(`lobby map ${chatSafe(mapName(next.lobby.map), 60)}`);
    }
  }
  if (summary.length === 0)
    throw new CodriverError("Tell me which match settings to change.");
  return { config: next, summary };
}

export const setMatchConfig = defineTool({
  name: "set_match_config",
  description:
    "Change the Match plugin's settings: match script, match maps, pick and ban type and order, lobby script and lobby map.",
  category: "plugins",
  // Its settings name scripts, maps and players
  covers: ["mode", "maps", "players"],
  minRole: "admin",
  input: matchInput,
  // Resolves names once, so a random lobby map stays the one that was confirmed
  async prepare(ctx, input) {
    const plugin = await matchPlugin(ctx);
    const { config } = await matchChanges(ctx, input, plugin.config);
    return {
      ...input,
      ...(input.script ? { script: config.script as string } : {}),
      ...(input.lobby_script
        ? { lobby_script: (config.lobby as any).script }
        : {}),
      ...(input.lobby_map ? { lobby_map: (config.lobby as any).map } : {}),
    };
  },
  async confirm(ctx, input) {
    const plugin = await matchPlugin(ctx);
    const { summary } = await matchChanges(ctx, input, plugin.config);
    return `Set the Match plugin to ${summary.join(", ")}?`;
  },
  async run(ctx, input) {
    const plugin = await matchPlugin(ctx);
    const { config, summary } = await matchChanges(ctx, input, plugin.config);
    const schema = storedManifest(plugin.manifest)?.configSchema;
    const check = schema ? validatePluginConfig(schema, config) : null;
    if (!check?.success)
      throw new CodriverError(
        `Those settings are invalid for the Match plugin${
          check?.issues[0]
            ? ` (${chatSafe(`${check.issues[0].path}: ${check.issues[0].message}`, 80)})`
            : ""
        }.`,
      );
    await saveServerPluginConfigAs(
      ctx.actor,
      ctx.serverId,
      plugin.pluginId,
      config,
    );
    return { reply: `Updated the Match plugin: ${summary.join(", ")}.` };
  },
});

function pluginCommands(manifest: unknown): string[] {
  return storedManifest(manifest)?.commands ?? [];
}

// A plugin that was just enabled loads in the background
const COMMAND_ATTEMPTS = 20;
const COMMAND_RETRY_MS = 500;

export const runPluginCommand = defineTool({
  name: "run_plugin_command",
  description:
    "Run a chat command of an installed plugin, such as the Match plugin's lobby (set the server to the lobby state), matchstart, matchstop or pickban.",
  category: "plugins",
  // A command can change the mode, maps or anything else the plugin controls
  covers: ["mode", "maps", "server"],
  minRole: "admin",
  input: z.strictObject({
    plugin: z.string().min(1).max(60),
    command: z
      .string()
      .min(1)
      .max(40)
      .describe("The command without the slash"),
    args: z.array(z.string().min(1).max(60)).max(10).optional(),
  }),
  async prepare(ctx, input) {
    const plugin = await findPlugin(ctx, input.plugin);
    const commands = pluginCommands(plugin.manifest);
    const wanted = normalize(
      input.command.replace(/^\//, "").replace(/\b(state|mode|the)\b/gi, " "),
    );
    const command =
      commands.find((c) => c.toLowerCase() === wanted.replace(/ /g, "")) ??
      (() => {
        const found = fuzzyFind(wanted, commands, (c) => c);
        if (found.kind === "match") return found.item;
        throw new CodriverError(
          `${chatSafe(plugin.name, 60)} has no command "${chatSafe(input.command, 30)}". It has: ${commands.map((c) => `/${c}`).join(", ") || "none"}.`,
        );
      })();
    return { ...input, plugin: `id:${plugin.pluginId}`, command };
  },
  async run(ctx, input) {
    const plugin = await findPlugin(ctx, input.plugin);
    if (!pluginCommands(plugin.manifest).includes(input.command))
      throw new CodriverError(
        `${chatSafe(plugin.name, 60)} has no command /${chatSafe(input.command, 30)}.`,
      );
    if (!plugin.enabled)
      throw new CodriverError(
        `${chatSafe(plugin.name, 60)} is off. Enable it first.`,
      );
    for (let attempt = 0; attempt < COMMAND_ATTEMPTS; attempt++) {
      const { handled } = await gbxService.runPluginCommand(ctx.serverId, {
        pluginId: plugin.pluginId,
        command: input.command,
        args: input.args ?? [],
        login: ctx.actor.login,
      });
      if (handled)
        return {
          reply: `Ran /${input.command} of ${chatSafe(plugin.name, 60)}.`,
        };
      await new Promise((resolve) => setTimeout(resolve, COMMAND_RETRY_MS));
    }
    throw new CodriverError(
      `${chatSafe(plugin.name, 60)} isn't running on the server, so /${input.command} didn't run.`,
    );
  },
});

export const matchTools = [setMatchConfig, runPluginCommand];
