import { beforeEach, describe, expect, it, vi } from "vitest";

const config = vi.hoisted(() => ({
  HETZNER: { KEY: "", PREVIOUS_KEY: undefined as string | undefined },
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/config", () => ({ default: config }));
vi.mock("@/lib/dbclient", () => ({ getClient: () => ({}) }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/sentry/report", () => ({ reportException: vi.fn() }));

import { decryptHetznerToken, encryptHetznerToken } from "@/lib/hetzner";
import { generateRandomString } from "@/lib/utils";

const strong = "k".repeat(40);

beforeEach(() => {
  config.HETZNER.KEY = strong;
  config.HETZNER.PREVIOUS_KEY = undefined;
});

describe("Hetzner secret encryption", () => {
  it("round-trips with a strong key", () => {
    expect(decryptHetznerToken(encryptHetznerToken("token"))).toBe("token");
  });

  it("refuses to encrypt with a missing or short key", () => {
    config.HETZNER.KEY = "";
    expect(() => encryptHetznerToken("token")).toThrow(/HETZNER_KEY/);
    config.HETZNER.KEY = "myhetznerkey";
    expect(() => encryptHetznerToken("token")).toThrow(/HETZNER_KEY/);
  });

  it("fails closed instead of returning the stored value", () => {
    const stored = encryptHetznerToken("token");
    config.HETZNER.KEY = "x".repeat(40);
    expect(() => decryptHetznerToken(stored)).toThrow(/could not be decrypted/);
    expect(() => decryptHetznerToken("garbage")).toThrow();
  });

  it("still decrypts values stored with the previous key", () => {
    const stored = encryptHetznerToken("token");
    config.HETZNER.KEY = "n".repeat(40);
    config.HETZNER.PREVIOUS_KEY = strong;
    expect(decryptHetznerToken(stored)).toBe("token");
  });
});

describe("generateRandomString", () => {
  it("returns the requested length from the alphabet", () => {
    const value = generateRandomString(64);
    expect(value).toMatch(/^[A-Za-z0-9]{64}$/);
    expect(generateRandomString(64)).not.toBe(value);
  });
});
