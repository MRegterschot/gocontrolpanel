import { brotliDecompressSync, gunzipSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET as docs } from "@/app/api/v1/docs/route";
import { GET as bundle } from "@/app/api/v1/docs/scalar.js/route";

describe("API docs", () => {
  it("serves Scalar from the panel with nothing sent to scalar.com", async () => {
    const res = await docs(new Request("http://localhost/api/v1/docs"));
    const html = await res.text();

    expect(res.headers.get("Content-Type")).toContain("text/html");
    expect(html).toMatch(
      /<script src="\/api\/v1\/docs\/scalar\.js\?v=\d+\.\d+\.\d+"/,
    );
    expect(html).toContain("/api/v1/openapi.json");
    expect(html).not.toContain("cdn.jsdelivr.net");
    expect(html).not.toMatch(/proxyUrl|proxy\.scalar\.com/);
    expect(html).toMatch(/telemetry"?:\s*false/);
    expect(html).toMatch(/withDefaultFonts"?:\s*false/);
  });

  it("serves the pinned bundle compressed and cacheable", async () => {
    const plain = await bundle(new Request("http://localhost/x"));
    expect(plain.headers.get("Content-Type")).toContain(
      "application/javascript",
    );
    expect(plain.headers.get("Cache-Control")).toContain("immutable");
    expect(plain.headers.get("Content-Encoding")).toBeNull();
    const source = await plain.text();
    expect(source.length).toBeGreaterThan(100_000);

    for (const [accept, encoding, decode] of [
      ["gzip, deflate, br", "br", brotliDecompressSync],
      ["gzip", "gzip", gunzipSync],
    ] as const) {
      const res = await bundle(
        new Request("http://localhost/x", {
          headers: { "accept-encoding": accept },
        }),
      );
      expect(res.headers.get("Content-Encoding")).toBe(encoding);
      expect(res.headers.get("Vary")).toBe("Accept-Encoding");
      const body = Buffer.from(await res.arrayBuffer());
      expect(body.length).toBeLessThan(source.length / 3);
      expect(decode(body).toString("utf8")).toBe(source);
    }
  });
});
