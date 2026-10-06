import { describe, expect, it } from "vitest";
import { matchesCustomEvent, parseCustomEventKey } from "../src/plugins/events";

describe("custom plugin events", () => {
  it("parses listener keys", () => {
    expect(parseCustomEventKey("records:newRecord")).toEqual({
      plugin: "records",
      name: "newRecord",
    });
    expect(parseCustomEventKey("records:*")).toEqual({
      plugin: "records",
      name: "*",
    });
    expect(parseCustomEventKey("finish")).toBeNull();
    expect(parseCustomEventKey("Records:x")).toBeNull();
    expect(parseCustomEventKey("records:a b")).toBeNull();
    expect(parseCustomEventKey("records:a:b")).toBeNull();
  });

  it("matches one event or every event of a plugin", () => {
    const event = { plugin: "records", name: "newRecord", payload: null };
    expect(
      matchesCustomEvent({ plugin: "records", name: "newRecord" }, event),
    ).toBe(true);
    expect(matchesCustomEvent({ plugin: "records", name: "*" }, event)).toBe(
      true,
    );
    expect(
      matchesCustomEvent({ plugin: "records", name: "other" }, event),
    ).toBe(false);
    expect(matchesCustomEvent({ plugin: "scorer", name: "*" }, event)).toBe(
      false,
    );
  });
});
