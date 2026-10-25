// Operations a public API key can be limited to; the web UI and the v1 routes share this list
export const API_KEY_SCOPES = [
  "server:read",
  "players:read",
  "players:write",
  "maps:read",
  "maps:write",
  "jukebox:read",
  "jukebox:write",
  "game:read",
  "game:write",
  "chat:read",
  "chat:write",
  "commands:write",
  "settings:read",
  "settings:write",
  "plugins:read",
  "plugins:write",
  "files:read",
  "files:write",
  "matches:read",
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export const API_KEY_SCOPE_DESCRIPTIONS: Record<ApiKeyScope, string> = {
  "server:read": "Server info",
  "players:read": "Connected players, bans, blacklist and guestlist",
  "players:write": "Kick, ban, spectate, blacklist, guestlist and fake players",
  "maps:read": "Map list, current map and map files",
  "maps:write": "Add, remove and reorder maps, also from Trackmania Exchange",
  "jukebox:read": "Jukebox contents",
  "jukebox:write": "Queue, remove, reorder and clear jukebox maps",
  "game:read": "Game mode script, its settings and opponent visibility",
  "game:write":
    "Restart, skip and pause; game mode, settings, points and script events",
  "chat:read": "Chat history",
  "chat:write": "Send chat messages",
  "commands:write":
    "Execute built-in and plugin chat commands as the key's creator",
  "settings:read": "Server settings and the join link, passwords included",
  "settings:write": "Change server settings, passwords included",
  "plugins:read": "Installed plugins and their settings, without secrets",
  "plugins:write":
    "Install, configure, update and remove plugins; the dedicated server's script plugin",
  "files:read": "Read files on the dedicated server, configs included",
  "files:write":
    "Create, change, move and delete files on the dedicated server",
  "matches:read": "Recorded matches",
};

// Every token starts with this, so leaked keys are easy to recognise and scan for
export const API_KEY_TOKEN_PREFIX = "tmcp_";

export function isApiKeyScope(value: unknown): value is ApiKeyScope {
  return (
    typeof value === "string" &&
    (API_KEY_SCOPES as readonly string[]).includes(value)
  );
}

// Stored scopes come from a Json column (MySQL) or a text array (PostgreSQL); unknown entries are dropped
export function parseApiKeyScopes(stored: unknown): ApiKeyScope[] {
  if (!Array.isArray(stored)) return [];
  return [...new Set(stored.filter(isApiKeyScope))];
}
