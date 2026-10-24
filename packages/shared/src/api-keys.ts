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
  "matches:read",
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export const API_KEY_SCOPE_DESCRIPTIONS: Record<ApiKeyScope, string> = {
  "server:read": "Server info",
  "players:read": "Connected players, bans, blacklist and guestlist",
  "players:write": "Kick, ban, spectate, blacklist and guestlist",
  "maps:read": "Map list, current map and map files",
  "maps:write": "Add, remove and reorder maps, also from Trackmania Exchange",
  "jukebox:read": "Jukebox contents",
  "jukebox:write": "Queue, remove, reorder and clear jukebox maps",
  "game:read": "Game mode script, its settings and opponent visibility",
  "game:write":
    "Restart, skip and pause; game mode, settings, points and script events",
  "chat:read": "Chat history",
  "chat:write": "Send chat messages",
  "matches:read": "Recorded matches",
};

// Every token starts with this, so leaked keys are easy to recognise and scan for
export const API_KEY_TOKEN_PREFIX = "gcp_";

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
