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
};

export function parseFastPath(text: string): PlannedCall | null {
  return commands[normalize(text)] ?? null;
}
