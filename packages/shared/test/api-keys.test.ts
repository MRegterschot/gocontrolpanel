import { describe, expect, it } from "vitest";
import {
  API_KEY_SCOPE_DESCRIPTIONS,
  API_KEY_SCOPES,
  isApiKeyScope,
  parseApiKeyScopes,
} from "../src/api-keys";

describe("api key scopes", () => {
  it("describes every scope", () => {
    expect(Object.keys(API_KEY_SCOPE_DESCRIPTIONS).sort()).toEqual(
      [...API_KEY_SCOPES].sort(),
    );
  });

  it("recognises known scopes only", () => {
    expect(isApiKeyScope("maps:read")).toBe(true);
    expect(isApiKeyScope("groups:admin")).toBe(false);
    expect(isApiKeyScope(1)).toBe(false);
  });

  it("drops unknown and duplicate stored scopes", () => {
    expect(
      parseApiKeyScopes(["maps:read", "nope", "maps:read", 3, "jukebox:write"]),
    ).toEqual(["maps:read", "jukebox:write"]);
  });

  it("treats a non-array as no scopes", () => {
    expect(parseApiKeyScopes(null)).toEqual([]);
    expect(parseApiKeyScopes("maps:read")).toEqual([]);
    expect(parseApiKeyScopes({ "maps:read": true })).toEqual([]);
  });
});
