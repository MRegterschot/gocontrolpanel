import { describe, expect, it } from "vitest";
import {
  assertPublicHttpsUrl,
  fetchPublic,
  isPrivateAddress,
} from "../src/net/public-fetch";

describe("public fetch", () => {
  it("treats internal and tunnelled addresses as private", () => {
    for (const address of [
      "127.0.0.1",
      "10.0.0.1",
      "169.254.169.254",
      "::1",
      "::127.0.0.1",
      "::ffff:7f00:1",
      "64:ff9b::7f00:1",
      "2002:7f00:1::1",
      "fec0::1",
      "fd12::1",
    ]) {
      expect(isPrivateAddress(address), address).toBe(true);
    }
    for (const address of [
      "8.8.8.8",
      "::ffff:8.8.8.8",
      "2606:4700:4700::1111",
    ]) {
      expect(isPrivateAddress(address), address).toBe(false);
    }
  });

  it("only accepts https host names", () => {
    expect(() => assertPublicHttpsUrl("http://example.com")).toThrow(/https/);
    expect(() => assertPublicHttpsUrl("https://10.0.0.1/x")).toThrow(
      /host name/,
    );
    expect(() => assertPublicHttpsUrl("https://[::1]/x")).toThrow(/host name/);
    expect(() => assertPublicHttpsUrl("file:///etc/passwd")).toThrow();
  });

  it("refuses names that resolve to private addresses", async () => {
    await expect(
      fetchPublic("https://localhost/", { timeoutMs: 2000, maxBytes: 10 }),
    ).rejects.toThrow(/private address/);
  });
});
