import { normalize } from "./text";
import type { PlannedCall } from "./types";

// Exact commands that need no model call
const commands: Record<string, PlannedCall> = {
  help: { tool: "codriver_help", input: {} },
  commands: { tool: "codriver_help", input: {} },
  skip: { tool: "skip_map", input: {} },
  next: { tool: "skip_map", input: {} },
  "next map": { tool: "skip_map", input: {} },
  "skip map": { tool: "skip_map", input: {} },
  restart: { tool: "restart_map", input: {} },
  res: { tool: "restart_map", input: {} },
  "restart map": { tool: "restart_map", input: {} },
  replay: { tool: "restart_map", input: {} },
  pause: { tool: "pause_match", input: { paused: true } },
  unpause: { tool: "pause_match", input: { paused: false } },
  resume: { tool: "pause_match", input: { paused: false } },
  "clear jukebox": { tool: "clear_jukebox", input: {} },
  "clear queue": { tool: "clear_jukebox", input: {} },
  status: { tool: "get_server_state", input: {} },
  settings: { tool: "get_mode_settings", input: {} },
  plugins: { tool: "list_plugins", input: {} },
  "list plugins": { tool: "list_plugins", input: {} },
  "reload plugins": { tool: "reload_plugins", input: {} },
};

// "enable live round", "turn off the live ranking plugin"
const pluginToggle =
  /^(enable|disable|turn on|turn off|switch on|switch off) (.+)$/;

export function parseFastPath(text: string): PlannedCall | null {
  const normalized = normalize(text);
  const exact = commands[normalized];
  if (exact) return exact;

  const toggle = pluginToggle.exec(normalized);
  if (toggle) {
    return {
      tool: "set_plugin_enabled",
      input: { plugin: toggle[2], enabled: !/disable|off/.test(toggle[1]) },
    };
  }
  return null;
}
