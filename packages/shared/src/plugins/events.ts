// Server events a sandboxed plugin may subscribe to. Left out: reconnect (service internals),
// playerManialinkPageAnswer (answers to other plugins' windows, an ECM key for instance) and
// adminCommand (notifications addressed to panel users).
export const PLUGIN_EVENT_NAMES = [
  "connect",
  "disconnect",
  "playerConnect",
  "playerConnectInfo",
  "playerDisconnect",
  "playerDisconnectInfo",
  "playerInfo",
  "playerInfoChanged",
  "playerList",
  "playerChat",
  "beginMap",
  "endMap",
  "startMap",
  "beginMatch",
  "startRound",
  "beginRound",
  "endRound",
  "live-endRound",
  "scores",
  "checkpoint",
  "live-checkpoint",
  "finish",
  "live-finish",
  "personalBest",
  "giveUp",
  "live-giveUp",
  "startLine",
  "skipOutro",
  "warmUpStart",
  "warmUpEnd",
  "warmUpStartRound",
  "updatedSettings",
  "elimination",
  "modeChange",
  "playerUpdated",
  "teamUpdated",
] as const;

export type PluginEventName = (typeof PLUGIN_EVENT_NAMES)[number];

export function isPluginEvent(name: string): name is PluginEventName {
  return (PLUGIN_EVENT_NAMES as readonly string[]).includes(name);
}

// Events plugins emit themselves. Listeners use "<slug>:<name>"; the slug is set by the host,
// so a plugin can only emit under its own name.
export const CUSTOM_EVENT_NAME = /^[A-Za-z0-9_.-]{1,64}$/;
const CUSTOM_EVENT_KEY =
  /^([a-z][a-z0-9-]{1,38}[a-z0-9]):([A-Za-z0-9_.-]{1,64}|\*)$/;
export const MAX_CUSTOM_EVENT_BYTES = 64 * 1024;

export interface PluginCustomEvent {
  // Slug of the plugin that emitted it
  plugin: string;
  name: string;
  payload: unknown;
}

// "records:newRecord" or "records:*" for every event of one plugin
export function parseCustomEventKey(
  key: string,
): { plugin: string; name: string } | null {
  const match = CUSTOM_EVENT_KEY.exec(key);
  return match ? { plugin: match[1], name: match[2] } : null;
}

export function matchesCustomEvent(
  key: { plugin: string; name: string },
  event: PluginCustomEvent,
): boolean {
  return (
    key.plugin === event.plugin && (key.name === "*" || key.name === event.name)
  );
}
