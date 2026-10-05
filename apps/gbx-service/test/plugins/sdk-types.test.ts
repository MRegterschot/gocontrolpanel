import type * as Sdk from "@tmcontrolpanel/plugin-sdk";
import type * as Shared from "@tmcp/shared";
import { PLUGIN_EVENT_NAMES, type PluginEventName } from "@tmcp/shared";
import { describe, expect, it } from "vitest";
import type { ServerEventMap } from "../../src/core/server/server-events";

// The SDK carries its own copy of the game types so it can be published on its own. A
// mismatch here fails the typecheck when the service's types drift from what plugins are told.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

const gameTypes: [
  Same<Shared.LiveInfo, Sdk.LiveInfo>,
  Same<Shared.PlayerInfo, Sdk.PlayerInfo>,
  Same<Shared.ActiveRound, Sdk.ActiveRound>,
  Same<Shared.PlayerRound, Sdk.PlayerRound>,
  Same<Shared.Team, Sdk.Team>,
  Same<Shared.Scores, Sdk.Scores>,
  Same<Shared.Waypoint, Sdk.Waypoint>,
  Same<Shared.WaypointEvent, Sdk.WaypointEvent>,
  Same<Shared.DetailedPlayerChat, Sdk.DetailedPlayerChat>,
  Same<Shared.GameModeType, Sdk.GameModeType>,
] = [true, true, true, true, true, true, true, true, true, true];

const events: [
  Same<PluginEventName, Sdk.PluginEventName>,
  Same<Pick<ServerEventMap, PluginEventName>, Sdk.PluginEvents>,
] = [true, true];

describe("plugin SDK types", () => {
  it("match the service's types", () => {
    expect([...gameTypes, ...events].every(Boolean)).toBe(true);
    expect(new Set(PLUGIN_EVENT_NAMES).size).toBe(PLUGIN_EVENT_NAMES.length);
  });
});
