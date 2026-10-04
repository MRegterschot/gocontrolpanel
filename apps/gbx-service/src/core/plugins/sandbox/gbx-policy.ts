// Dedicated server methods a sandboxed plugin may call, per capability. Manialink and chat
// methods are missing on purpose: those go through ctx.ui and ctx.chat, which namespace and
// rate limit them. Methods that return passwords or IP addresses are not listed at all.

const ALWAYS: readonly string[] = [
  "GetCurrentMapInfo",
  "GetNextMapInfo",
  "GetCurrentMapIndex",
  "GetNextMapIndex",
  "GetPlayerList",
  "GetPlayerInfo",
  "GetMainServerPlayerInfo",
  "GetModeScriptInfo",
  "GetModeScriptSettings",
  "GetScriptName",
  "GetServerName",
  "GetServerComment",
  "GetVersion",
  "GetMaxPlayers",
  "GetMaxSpectators",
];

const BY_CAPABILITY: Record<string, readonly string[]> = {
  "maps:read": ["GetMapList", "GetMapInfo"],
  "maps:write": [
    "NextMap",
    "RestartMap",
    "JumpToMapIndex",
    "JumpToMapIdent",
    "SetNextMapIndex",
    "SetNextMapIdent",
    "AddMap",
    "AddMapList",
    "InsertMap",
    "InsertMapList",
    "RemoveMap",
    "RemoveMapList",
    "ChooseNextMap",
    "ChooseNextMapList",
  ],
  "players:moderate": [
    "Kick",
    "Ban",
    "UnBan",
    "BanAndBlackList",
    "BlackList",
    "UnBlackList",
    "ForceSpectator",
    "ForceSpectatorTarget",
    "SpectatorReleasePlayerSlot",
    "ForcePlayerTeam",
    "AddGuest",
    "RemoveGuest",
    "Ignore",
    "UnIgnore",
    "GetBanList",
    "GetBlackList",
    "GetGuestList",
    "GetIgnoreList",
  ],
  "mode:control": ["SetModeScriptSettings", "SetScriptName"],
};

// Mode script methods (TriggerModeScriptEventArray) that only make the mode report state
const SCRIPT_READS: readonly string[] = [
  "Trackmania.GetScores",
  "Trackmania.WarmUp.GetStatus",
  "Maniaplanet.WarmUp.GetStatus",
  "Maniaplanet.Pause.GetStatus",
  "Trackmania.GetPointsRepartition",
  "Maniaplanet.Mode.GetUseTeams",
];

export function allowedGbxMethods(capabilities: readonly string[]): Set<string> {
  const methods = new Set(ALWAYS);
  for (const capability of capabilities) {
    for (const method of BY_CAPABILITY[capability] ?? []) methods.add(method);
  }
  return methods;
}

// Script reads are always fine; anything else drives the mode and needs mode:control
export function isScriptCallAllowed(method: string, capabilities: readonly string[]): boolean {
  return SCRIPT_READS.includes(method) || capabilities.includes("mode:control");
}
