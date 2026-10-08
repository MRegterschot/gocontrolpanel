import { normalize } from "./text";
import type { ToolCategory } from "./types";

const keywords: Record<ToolCategory, string[]> = {
  maps: [
    "map",
    "maps",
    "track",
    "tmx",
    "exchange",
    "queue",
    "jukebox",
    "skip",
    "next",
    "restart",
    "replay",
    "jump",
    "play",
    "snow",
    "rally",
    "desert",
    "stadium",
    "car",
    "tech",
    "fullspeed",
    "dirt",
    "ice",
    "grass",
    "plastic",
    "rpg",
    "trial",
    "lol",
    "author",
    "random",
    "awarded",
    "newest",
    "weekly",
    "short",
    "shorts",
    "totd",
    "royal",
    "campaign",
    "campaigns",
    "seasonal",
    "season",
    "club",
    "clubs",
    "mappack",
    "mappacks",
    "pack",
    "attack",
    "gamemode",
  ],
  mode: [
    "mode",
    "cup",
    "rounds",
    "round",
    "timeattack",
    "ta",
    "knockout",
    "ko",
    "laps",
    "lap",
    "teams",
    "team",
    "champion",
    "points",
    "point",
    "limit",
    "setting",
    "settings",
    "warmup",
    "warm",
    "pause",
    "unpause",
    "resume",
    "finish",
    "timeout",
    "winners",
    "match",
  ],
  players: [
    "kick",
    "ban",
    "unban",
    "blacklist",
    "unblacklist",
    "guest",
    "guests",
    "spectator",
    "spectate",
    "spec",
    "player",
    "points",
    "point",
    "team",
    "blue",
    "red",
    "force",
  ],
  plugins: [
    "plugin",
    "plugins",
    "enable",
    "disable",
    "turn",
    "widget",
    "reload",
    "config",
    "configure",
  ],
  server: [
    "server",
    "name",
    "rename",
    "comment",
    "description",
    "slots",
    "max",
    "announce",
    "announcement",
    "tell",
    "say",
    "message",
    "everyone",
  ],
  info: [
    "list",
    "show",
    "who",
    "what",
    "which",
    "how",
    "record",
    "records",
    "wr",
    "pb",
    "best",
    "players",
    "online",
    "current",
    "status",
    "help",
    "explain",
    "does",
  ],
};

const allCategories = Object.keys(keywords) as ToolCategory[];
// Requests without a keyword most often ask about maps or the mode, or just chat
const fallbackCategories: ToolCategory[] = ["maps", "mode", "info"];

export interface Route {
  categories: ToolCategory[];
  // True when no keyword matched, so the categories are a guess
  fallback: boolean;
}

export const everyCategory = allCategories;

// Keywords of `category` that no other category uses, found in the text. They show the
// player really asked about that area, unlike words such as "points" that fit several.
export function exclusiveKeywordHits(
  text: string,
  category: ToolCategory,
): string[] {
  const words = new Set(normalize(text).split(" "));
  return keywords[category].filter(
    (word) =>
      words.has(word) &&
      !allCategories.some(
        (other) => other !== category && keywords[other].includes(word),
      ),
  );
}

export function routeRequest(text: string): Route {
  const words = new Set(normalize(text).split(" "));
  const hits = allCategories.filter((category) =>
    keywords[category].some((word) => words.has(word)),
  );
  if (text.includes("?") && !hits.includes("info")) hits.push("info");
  return hits.length > 0
    ? { categories: hits, fallback: false }
    : { categories: fallbackCategories, fallback: true };
}

// Categories whose keywords appear in the text, or the likeliest ones when none do
export function routeCategories(text: string): ToolCategory[] {
  return routeRequest(text).categories;
}
