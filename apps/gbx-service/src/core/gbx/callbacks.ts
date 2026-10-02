import type {
  Elimination,
  EndMap,
  PauseStatus,
  PlayerChat,
  PlayerManialinkPageAnswer,
  Scores,
  SMapInfo,
  SPlayerInfo,
  StartMap,
  WarmUp,
  WarmUpStatus,
  Waypoint,
  WaypointEvent,
} from "@gcp/shared";

// Typed view of the server callbacks GoControlPanel reacts to
export type GameEvent =
  | { type: "playerConnect"; login: string }
  | { type: "playerDisconnect"; login: string }
  | { type: "playerInfoChanged"; player: SPlayerInfo }
  | { type: "beginMap"; map: SMapInfo }
  | { type: "endMap"; map: SMapInfo }
  | { type: "beginMatch" }
  | { type: "echo"; internal: string; public: string }
  | { type: "playerChat"; chat: PlayerChat }
  | { type: "manialinkAnswer"; answer: PlayerManialinkPageAnswer }
  | { type: "podiumStart" }
  | { type: "waypoint"; waypoint: Waypoint }
  | { type: "endMapStart"; endMap: EndMap }
  | { type: "startMapStart"; startMap: StartMap }
  | { type: "startRoundStart" }
  | { type: "scores"; scores: Scores }
  | { type: "warmUpStatus"; status: WarmUpStatus }
  | { type: "pauseStatus"; status: PauseStatus }
  | { type: "giveUp"; event: WaypointEvent }
  | { type: "skipOutro"; event: WaypointEvent }
  | { type: "startLine"; event: WaypointEvent }
  | { type: "warmUpStart" }
  | { type: "warmUpEnd" }
  | { type: "warmUpStartRound"; warmUp: WarmUp }
  | { type: "elimination"; elimination: Elimination };

export type GameEventType = GameEvent["type"];

// Mode script callbacks carry their payload as a one-element array of JSON text
function parseScriptPayload(raw: unknown): any {
  const text = Array.isArray(raw) ? raw[0] : raw;
  if (typeof text !== "string") return text ?? {};
  if (text.length === 0) return {};
  return JSON.parse(text);
}

function parseScriptCallback(data: unknown): GameEvent | null {
  if (!Array.isArray(data) || data.length === 0) return null;

  const name = data[0];
  if (typeof name !== "string") return null;

  switch (name) {
    case "Maniaplanet.Podium_Start":
      return { type: "podiumStart" };
    case "Trackmania.Event.WayPoint":
      return { type: "waypoint", waypoint: parseScriptPayload(data[1]) };
    case "Maniaplanet.EndMap_Start":
      return { type: "endMapStart", endMap: parseScriptPayload(data[1]) };
    case "Maniaplanet.StartMap_Start":
      return { type: "startMapStart", startMap: parseScriptPayload(data[1]) };
    case "Maniaplanet.StartRound_Start":
      return { type: "startRoundStart" };
    case "Trackmania.Scores":
      return { type: "scores", scores: parseScriptPayload(data[1]) };
    case "Trackmania.WarmUp.Status":
      return { type: "warmUpStatus", status: parseScriptPayload(data[1]) };
    case "Maniaplanet.Pause.Status":
      return { type: "pauseStatus", status: parseScriptPayload(data[1]) };
    case "Trackmania.Event.GiveUp":
      return { type: "giveUp", event: parseScriptPayload(data[1]) };
    case "Trackmania.Event.SkipOutro":
      return { type: "skipOutro", event: parseScriptPayload(data[1]) };
    case "Trackmania.Event.StartLine":
      return { type: "startLine", event: parseScriptPayload(data[1]) };
    case "Trackmania.WarmUp.Start":
      return { type: "warmUpStart" };
    case "Trackmania.WarmUp.End":
      return { type: "warmUpEnd" };
    case "Trackmania.WarmUp.StartRound":
      return { type: "warmUpStartRound", warmUp: parseScriptPayload(data[1]) };
    case "Trackmania.Knockout.Elimination":
      return { type: "elimination", elimination: parseScriptPayload(data[1]) };
    default:
      return null;
  }
}

// Returns null for callbacks we don't handle; throws only on malformed JSON payloads
export function parseCallback(method: string, data: unknown): GameEvent | null {
  const args = Array.isArray(data) ? data : [];

  switch (method) {
    case "ManiaPlanet.PlayerConnect":
      return { type: "playerConnect", login: args[0] };
    case "ManiaPlanet.PlayerDisconnect":
      return { type: "playerDisconnect", login: args[0] };
    case "ManiaPlanet.PlayerInfoChanged":
      return { type: "playerInfoChanged", player: args[0] };
    case "ManiaPlanet.BeginMap":
      return { type: "beginMap", map: args[0] };
    case "ManiaPlanet.EndMap":
      return { type: "endMap", map: args[0] };
    case "ManiaPlanet.BeginMatch":
      return { type: "beginMatch" };
    case "ManiaPlanet.Echo":
      return { type: "echo", internal: args[0], public: args[1] };
    case "ManiaPlanet.PlayerChat":
      return {
        type: "playerChat",
        chat: {
          PlayerUid: args[0],
          Login: args[1],
          Text: args[2],
          IsRegistredCmd: args[3],
          Options: args[4],
        },
      };
    case "ManiaPlanet.PlayerManialinkPageAnswer":
      return {
        type: "manialinkAnswer",
        answer: {
          PlayerUid: args[0],
          Login: args[1],
          Answer: args[2],
          Entries: args[3] ?? [],
        },
      };
    case "ManiaPlanet.ModeScriptCallbackArray":
      return parseScriptCallback(data);
    default:
      return null;
  }
}
