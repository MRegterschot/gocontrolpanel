import { describe, expect, it } from "vitest";
import { assertGbxServiceConfig, findGbxServiceConfigProblems } from "../src/lib/config-check";

const good = { TOKEN: "t".repeat(32), WS_TICKET_SECRET: "s".repeat(32) };

describe("findGbxServiceConfigProblems", () => {
  it("accepts secrets of 32 characters or more", () => {
    expect(findGbxServiceConfigProblems(good)).toEqual([]);
    expect(findGbxServiceConfigProblems({ TOKEN: "t".repeat(80), WS_TICKET_SECRET: "s".repeat(33) })).toEqual([]);
  });

  it("reports unset values, which default to an empty string", () => {
    expect(findGbxServiceConfigProblems({ TOKEN: "", WS_TICKET_SECRET: "" })).toEqual([
      "GBX_SERVICE_TOKEN is not set",
      "WS_TICKET_SECRET is not set",
    ]);
  });

  it("treats a value of only whitespace as unset", () => {
    expect(findGbxServiceConfigProblems({ ...good, TOKEN: "   " })).toEqual(["GBX_SERVICE_TOKEN is not set"]);
  });

  it("reports values that are too short and names the one that is wrong", () => {
    expect(findGbxServiceConfigProblems({ ...good, WS_TICKET_SECRET: "s".repeat(31) })).toEqual([
      "WS_TICKET_SECRET must be at least 32 characters",
    ]);
  });
});

describe("assertGbxServiceConfig", () => {
  it("does nothing for a valid configuration", () => {
    expect(() => assertGbxServiceConfig(good)).not.toThrow();
  });

  it("lists every problem at once and says where to fix them, without leaking values", () => {
    const secret = "short-but-secret";
    let error: Error | undefined;
    try {
      assertGbxServiceConfig({ TOKEN: secret, WS_TICKET_SECRET: "" });
    } catch (e) {
      error = e as Error;
    }

    expect(error?.name).toBe("InvalidConfigError");
    expect(error?.message).toContain("GBX_SERVICE_TOKEN must be at least 32 characters");
    expect(error?.message).toContain("WS_TICKET_SECRET is not set");
    expect(error?.message).toContain(".env");
    expect(error?.message).not.toContain(secret);
  });
});
