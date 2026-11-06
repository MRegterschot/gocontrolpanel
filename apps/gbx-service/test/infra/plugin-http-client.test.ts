import { describe, expect, it } from "vitest";
import { HttpsPluginClient, isPrivateAddress } from "../../src/infra/http/plugin-http-client";

describe("plugin HTTP client", () => {
  it("treats internal addresses as private", () => {
    for (const address of [
      "127.0.0.1",
      "10.1.2.3",
      "172.20.0.5",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
      "not-an-ip",
    ]) {
      expect(isPrivateAddress(address), address).toBe(true);
    }
    for (const address of ["1.1.1.1", "142.250.74.78", "2606:4700:4700::1111", "::ffff:8.8.8.8"]) {
      expect(isPrivateAddress(address), address).toBe(false);
    }
  });

  it("refuses IP addresses and plain http before connecting", async () => {
    const client = new HttpsPluginClient();
    const request = { method: "GET", headers: {}, timeoutMs: 1000, maxResponseBytes: 1000 };
    await expect(client.fetch({ ...request, url: "https://127.0.0.1/" })).rejects.toThrow(/not an IP address/);
    await expect(client.fetch({ ...request, url: "https://[::1]/" })).rejects.toThrow(/not an IP address/);
    await expect(client.fetch({ ...request, url: "http://example.com/" })).rejects.toThrow(/https/);
  });

  it("refuses names that resolve to a private address", async () => {
    const client = new HttpsPluginClient();
    await expect(
      client.fetch({ url: "https://localhost/", method: "GET", headers: {}, timeoutMs: 2000, maxResponseBytes: 1000 }),
    ).rejects.toThrow(/private address/);
  });
});
