import {
  pauseMatchAs,
  restartMapAs,
  setModeScriptSettingsAs,
  setScriptNameAs,
} from "@/actions/gbx/server-only/game";
import { getGbxClient } from "@/lib/gbx-service";
import "server-only";
import { z } from "zod/v4";
import { modeKey, modeKeys, resolveSettings, scriptForMode } from "../modes";
import { getLiveState } from "../state";
import { chatSafe } from "../text";
import { CodriverError, defineTool } from "../types";

const settingsInput = z
  .array(
    z.strictObject({
      name: z.string().min(1).max(60),
      value: z.union([z.string().max(200), z.number(), z.boolean()]),
    }),
  )
  .max(10);

function describe(settings: Record<string, string | number | boolean>): string {
  return Object.entries(settings)
    .map(([name, value]) => `${name} ${chatSafe(String(value), 30)}`)
    .join(", ");
}

// The new script loads with the restart; settings only apply once it runs
async function waitForScript(serverId: string, script: string): Promise<void> {
  const client = getGbxClient(serverId);
  for (let attempt = 0; attempt < 30; attempt++) {
    const current = await client.call<{ CurrentValue: string }>(
      "GetScriptName",
    );
    if (current.CurrentValue === script) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new CodriverError(
    `${modeKey(script)} did not load in time; the settings were not applied.`,
  );
}

export const setMode = defineTool({
  name: "set_mode",
  description:
    "Switch the game mode, optionally with settings; restarts the current map.",
  category: "mode",
  minRole: "admin",
  input: z.strictObject({
    mode: z.enum(modeKeys),
    settings: settingsInput.optional(),
  }),
  async run(ctx, input) {
    const script = scriptForMode(input.mode)!;
    // Validated before anything changes on the server
    const settings = input.settings?.length
      ? resolveSettings(script, input.settings)
      : {};

    await setScriptNameAs(ctx.actor, ctx.serverId, script);
    await restartMapAs(ctx.actor, ctx.serverId);
    if (Object.keys(settings).length > 0) {
      await waitForScript(ctx.serverId, script);
      await setModeScriptSettingsAs(ctx.actor, ctx.serverId, settings);
      return { reply: `Switched to ${input.mode} with ${describe(settings)}.` };
    }
    return { reply: `Switched to ${input.mode}.` };
  },
});

export const setModeSettings = defineTool({
  name: "set_mode_settings",
  description:
    "Change settings of the current mode, such as the points limit or time limit.",
  category: "mode",
  minRole: "moderator",
  input: z.strictObject({ settings: settingsInput.min(1) }),
  async confirm(ctx, input) {
    const state = await getLiveState(ctx.serverId);
    const settings = resolveSettings(state.script, input.settings);
    return `Set ${describe(settings)} for ${modeKey(state.script)}?`;
  },
  async run(ctx, input) {
    const state = await getLiveState(ctx.serverId);
    const settings = resolveSettings(state.script, input.settings);
    await setModeScriptSettingsAs(ctx.actor, ctx.serverId, settings);
    return { reply: `Set ${describe(settings)}.` };
  },
});

export const pauseMatch = defineTool({
  name: "pause_match",
  description: "Pause or resume the match.",
  category: "mode",
  minRole: "moderator",
  input: z.strictObject({ paused: z.boolean() }),
  async run(ctx, input) {
    await pauseMatchAs(ctx.actor, ctx.serverId, input.paused);
    return { reply: input.paused ? "Match paused." : "Match resumed." };
  },
});

export const modeTools = [setMode, setModeSettings, pauseMatch];
