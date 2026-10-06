// Methods the web app may call through the generic passthrough (GS-50).
// Anything touching live state, plugins or chat announcements has a dedicated command instead.
export const PASSTHROUGH_METHODS: ReadonlySet<string> = new Set([
  // Server settings
  "GetServerOptions",
  "SetServerOptions",
  "GetHideServer",
  "IsKeepingPlayerSlots",
  "AreHornsDisabled",
  "AreServiceAnnouncesDisabled",
  "GetSystemInfo",
  "AreProfileSkinsDisabled",
  "IsMapDownloadAllowed",
  "SetConnectionRates",
  "DisableProfileSkins",
  "AllowMapDownload",
  "GetMainServerPlayerInfo",
  "GetChatLines",
  // Game flow
  "RestartMap",
  "NextMap",
  "SetForceShowAllOpponents",
  "GetForceShowAllOpponents",
  "GetScriptName",
  "AppendPlaylistFromMatchSettings",
  "InsertPlaylistFromMatchSettings",
  "SaveMatchSettings",
  "GetModeScriptInfo",
  "GetModeScriptSettings",
  "TriggerModeScriptEventArray",
  // Maps (read + navigation)
  "GetCurrentMapIndex",
  "JumpToMapIndex",
  "GetMapList",
  "GetMapInfo",
  "GetCurrentMapInfo",
  // Players
  "GetPlayerList",
  "GetPlayerInfo",
  "Ban",
  "UnBan",
  "GetBanList",
  "CleanBanList",
  "BlackList",
  "UnBlackList",
  "GetBlackList",
  "LoadBlackList",
  "SaveBlackList",
  "CleanBlackList",
  "AddGuest",
  "RemoveGuest",
  "GetGuestList",
  "LoadGuestList",
  "SaveGuestList",
  "CleanGuestList",
  "Kick",
  "ForceSpectator",
  // Advanced
  "ConnectFakePlayer",
  "DisconnectFakePlayer",
  // Dedicated server plugin
  "GetServerPlugin",
  "SetServerPlugin",
  "GetServerPluginVariables",
  "SetServerPluginVariables",
  "TriggerServerPluginEvent",
  "TriggerServerPluginEventArray",
]);

export function isPassthroughAllowed(method: string): boolean {
  return PASSTHROUGH_METHODS.has(method);
}
