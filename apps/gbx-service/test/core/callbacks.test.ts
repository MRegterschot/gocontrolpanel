import { describe, expect, it } from "vitest";
import { parseCallback } from "../../src/core/gbx/callbacks";

describe("parseCallback", () => {
  it("maps plain ManiaPlanet callbacks", () => {
    expect(parseCallback("ManiaPlanet.PlayerConnect", ["login", false])).toEqual({
      type: "playerConnect",
      login: "login",
    });
    expect(parseCallback("ManiaPlanet.BeginMatch", [])).toEqual({ type: "beginMatch" });
    expect(parseCallback("ManiaPlanet.Echo", ["UpdatedSettings", ""])).toEqual({
      type: "echo",
      internal: "UpdatedSettings",
      public: "",
    });
  });

  it("names positional chat and manialink arguments", () => {
    expect(parseCallback("ManiaPlanet.PlayerChat", [3, "abc", "/help", true, 0])).toEqual({
      type: "playerChat",
      chat: { PlayerUid: 3, Login: "abc", Text: "/help", IsRegistredCmd: true, Options: 0 },
    });
    expect(
      parseCallback("ManiaPlanet.PlayerManialinkPageAnswer", [3, "abc", "action", undefined]),
    ).toEqual({
      type: "manialinkAnswer",
      answer: { PlayerUid: 3, Login: "abc", Answer: "action", Entries: [] },
    });
  });

  it("parses the JSON payload of mode script callbacks", () => {
    const event = parseCallback("ManiaPlanet.ModeScriptCallbackArray", [
      "Trackmania.Event.WayPoint",
      [JSON.stringify({ login: "abc", racetime: 1234, isendrace: true })],
    ]);
    expect(event).toEqual({
      type: "waypoint",
      waypoint: { login: "abc", racetime: 1234, isendrace: true },
    });
  });

  it("handles payload-less script callbacks", () => {
    expect(
      parseCallback("ManiaPlanet.ModeScriptCallbackArray", ["Maniaplanet.StartRound_Start", []]),
    ).toEqual({ type: "startRoundStart" });
  });

  it("ignores unknown callbacks", () => {
    expect(parseCallback("ManiaPlanet.StatusChanged", [4, "Running"])).toBeNull();
    expect(
      parseCallback("ManiaPlanet.ModeScriptCallbackArray", ["Some.Custom.Event", ["{}"]]),
    ).toBeNull();
    expect(parseCallback("ManiaPlanet.ModeScriptCallbackArray", [])).toBeNull();
  });

  it("throws on malformed JSON so the runtime can log it", () => {
    expect(() =>
      parseCallback("ManiaPlanet.ModeScriptCallbackArray", ["Trackmania.Scores", ["{oops"]]),
    ).toThrow();
  });
});
