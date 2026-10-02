import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config";

const base = {
  DATABASE_URL: "postgresql://localhost/db",
  REDIS_URI: "redis://localhost:6379",
  GBX_SERVICE_TOKEN: "t".repeat(32),
  WS_TICKET_SECRET: "s".repeat(32),
};

describe("loadConfig", () => {
  it("applies defaults and splits lists", () => {
    const config = loadConfig({ ...base, WS_ALLOWED_ORIGINS: "http://a, http://b", GBX_SERVICE_ENABLED_SERVERS: "" });
    expect(config.PORT).toBe(3100);
    expect(config.WS_ALLOWED_ORIGINS).toEqual(["http://a", "http://b"]);
    expect(config.GBX_SERVICE_ENABLED_SERVERS).toEqual([]);
    expect(config.templatesDir).toMatch(/gbx-service\/templates$/);
  });

  it("lists every problem at once", () => {
    expect(() => loadConfig({ GBX_SERVICE_TOKEN: "short" })).toThrow(
      /DATABASE_URL[\s\S]*REDIS_URI[\s\S]*GBX_SERVICE_TOKEN must be at least 32[\s\S]*WS_TICKET_SECRET/,
    );
  });
});
