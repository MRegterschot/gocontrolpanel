import { describe, expect, it } from "vitest";
import { gbxCallBodySchema, scriptSettingsBodySchema } from "../src/internal-api";
import {
  decodeServerLifecycleEvent,
  encodeServerLifecycleEvent,
} from "../src/server-events";

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
