import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config";

// Repo root from apps/gbx-service/test/infra
const read = (path: string): NodeJS.Dict<string> =>
  parseEnv(readFileSync(fileURLToPath(new URL(`../../../../${path}`, import.meta.url)), "utf8"));

const root = read(".env.example");
const web = read("apps/web/.env.example");
const service = read("apps/gbx-service/.env.example");

describe("env examples", () => {
  it.each([
    ["root", root],
    ["service", service],
  ])("%s example starts the service as it is", (_, env) => {
    expect(() => loadConfig(env)).not.toThrow();
  });

  it.each(["DATABASE_URL", "REDIS_URI", "GBX_SERVICE_TOKEN", "WS_TICKET_SECRET"])(
    "%s is the same in every example",
    (key) => {
      expect(root[key], key).toBeTruthy();
      expect(web[key]).toBe(root[key]);
      expect(service[key]).toBe(root[key]);
    },
  );

  it("points the web app at the port the service listens on", () => {
    const port = loadConfig(service).PORT;
    for (const env of [root, web]) {
      expect(new URL(env.GBX_SERVICE_URL!).port).toBe(String(port));
      expect(new URL(env.GBX_SERVICE_WS_URL!).port).toBe(String(port));
    }
  });

  it("allows the web app's origin to open sockets", () => {
    const origin = new URL(root.NEXTAUTH_URL!).origin;
    expect(loadConfig(root).WS_ALLOWED_ORIGINS).toContain(origin);
    expect(loadConfig(service).WS_ALLOWED_ORIGINS).toContain(origin);
  });

  it("uses the credentials of the dev database containers", () => {
    expect(root.DB).toBe("mysql");
    expect(web.DB).toBe("mysql");
    expect(root.DATABASE_URL).toBe("mysql://root:root@localhost:3306/tmcontrolpanel");
  });
});
