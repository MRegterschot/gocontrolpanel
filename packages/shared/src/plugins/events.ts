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
