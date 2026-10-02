import { describe, expect, it } from "vitest";
import { gbxCallBodySchema, scriptSettingsBodySchema } from "../src/internal-api";
import {
  decodeServerLifecycleEvent,
  encodeServerLifecycleEvent,
} from "../src/server-events";
import { matchPluginConfigSchema, pickAndBanToString, stringToPickAndBan } from "../src/types/plugins";

describe("server lifecycle events", () => {
  it("round-trips a valid event", () => {
    const raw = encodeServerLifecycleEvent({ type: "server.updated", serverId: "s1" });
    expect(decodeServerLifecycleEvent(raw)).toEqual({ type: "server.updated", serverId: "s1" });
  });

  it("returns null for garbage", () => {
    expect(decodeServerLifecycleEvent("not json")).toBeNull();
    expect(decodeServerLifecycleEvent(JSON.stringify({ type: "nope" }))).toBeNull();
  });
});

describe("internal api schemas", () => {
  it("defaults gbx call params to an empty list", () => {
    expect(gbxCallBodySchema.parse({ method: "GetMapList" })).toEqual({
      method: "GetMapList",
      params: [],
    });
  });

  it("only accepts scalar script settings", () => {
    expect(() =>
      scriptSettingsBodySchema.parse({ settings: { S_PointsLimit: { nested: 1 } } }),
    ).toThrow();
  });
});

describe("plugin configs", () => {
  it("parses the stored match config and keeps unknown keys", () => {
    const parsed = matchPluginConfigSchema.parse({
      admins: ["a"],
      pickAndBan: { order: "b:1,p:2,r", timeout: "30" },
      legacy: true,
    });
    expect(parsed.pickAndBan?.timeout).toBe(30);
    expect(parsed.pickAndBan?.choosePosition).toBe(false);
    expect((parsed as Record<string, unknown>).legacy).toBe(true);
  });

  it("round-trips pick and ban orders", () => {
    const order = stringToPickAndBan("b:1,b:2,p:2,p:1,r");
    expect(order).toEqual([
      { action: "ban", seed: 1 },
      { action: "ban", seed: 2 },
      { action: "pick", seed: 2 },
      { action: "pick", seed: 1 },
      { action: "random" },
    ]);
    expect(pickAndBanToString(order)).toBe("b:1,b:2,p:2,p:1,r");
    expect(() => stringToPickAndBan("x:1")).toThrow();
  });
});
