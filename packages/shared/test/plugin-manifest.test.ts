import { describe, expect, it } from "vitest";
import {
  NATIVE_COMMANDS,
  addedCapabilities,
  coercePluginConfig,
  compareVersions,
  describeCapability,
  isCapability,
  isHostAllowed,
  maskSecrets,
  mergeSecrets,
  parseManifest,
  pluginConfigSchemaSchema,
  validatePluginConfig,
  type PluginConfigSchema,
} from "../src/plugins";

export const validManifest = {
  slug: "hello-world",
  name: "Hello World",
  version: "1.0.0",
  sdk: 1,
  description: "Says hello.",
  author: "Someone",
  capabilities: ["ui", "chat:send", "http:api.example.com"],
  commands: ["hello"],
};

describe("capabilities", () => {
  it("knows static and http capabilities", () => {
    expect(isCapability("ui")).toBe(true);
    expect(isCapability("http:api.example.com")).toBe(true);
    expect(isCapability("http:*.example.com")).toBe(true);
    expect(isCapability("http:localhost")).toBe(false);
    expect(isCapability("http:10.0.0.1")).toBe(false);
    expect(isCapability("http:xn--bcher-kva.example")).toBe(true);
    expect(isCapability("http:https://example.com")).toBe(false);
    expect(isCapability("http:example.com:8080")).toBe(false);
    expect(isCapability("gbx:all")).toBe(false);
  });

  it("matches hosts exactly or by subdomain wildcard", () => {
    const caps = ["http:api.example.com", "http:*.cdn.test"];
    expect(isHostAllowed("api.example.com", caps)).toBe(true);
    expect(isHostAllowed("API.example.com", caps)).toBe(true);
    expect(isHostAllowed("example.com", caps)).toBe(false);
    expect(isHostAllowed("evil-api.example.com", caps)).toBe(false);
    expect(isHostAllowed("a.cdn.test", caps)).toBe(true);
    expect(isHostAllowed("cdn.test", caps)).toBe(false);
    expect(isHostAllowed("a.cdn.test.evil.com", caps)).toBe(false);
  });

  it("lists what an update adds", () => {
    expect(addedCapabilities(["ui"], ["ui", "storage"])).toEqual(["storage"]);
    expect(describeCapability("http:a.b.c").label).toBe("Web requests to a.b.c");
  });
});

describe("versions", () => {
  it("orders releases and pre-releases", () => {
    const sorted = ["1.0.0", "1.0.0-beta.2", "0.9.9", "1.0.0-alpha", "1.10.0", "1.2.0"].sort(
      compareVersions,
    );
    expect(sorted).toEqual(["0.9.9", "1.0.0-alpha", "1.0.0-beta.2", "1.0.0", "1.2.0", "1.10.0"]);
  });
});

describe("manifest", () => {
  it("accepts a valid manifest and fills defaults", () => {
    const result = parseManifest(validManifest);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.manifest.entry).toBe("index.js");
    expect(result.manifest.gamemodes).toEqual([]);
  });

  it.each(NATIVE_COMMANDS)("rejects reserved names, /%s and unknown capabilities", (command) => {
    const result = parseManifest({
      ...validManifest,
      slug: "server",
      commands: [command],
      capabilities: ["root"],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.join("\n")).toMatch(/slug: This name is reserved/);
    expect(result.issues.join("\n")).toMatch(/commands.0/);
    expect(result.issues.join("\n")).toMatch(/capabilities.0: Unknown capability/);
  });

  it("accepts first-party names, which the marketplace publishes", () => {
    expect(parseManifest({ ...validManifest, slug: "match" }).success).toBe(true);
  });

  it("rejects unknown keys and entries outside the package", () => {
    expect(parseManifest({ ...validManifest, main: "x.js" }).success).toBe(false);
    expect(parseManifest({ ...validManifest, entry: "../x.js" }).success).toBe(false);
    expect(parseManifest({ ...validManifest, version: "1.0" }).success).toBe(false);
  });
});

const schema: PluginConfigSchema = pluginConfigSchemaSchema.parse({
  type: "object",
  properties: {
    greeting: { type: "string", title: "Greeting", default: "Hi", maxLength: 20 },
    rows: { type: "integer", minimum: 1, maximum: 10, default: 5 },
    show: { type: "boolean", default: true },
    mode: { type: "string", enum: ["a", "b"] },
    apiKey: { type: "string", secret: true },
    admins: { type: "array", items: { type: "string" }, maxItems: 3 },
  },
  required: ["greeting"],
});

describe("config schema", () => {
  it("rejects defaults that don't fit and unknown keywords", () => {
    expect(
      pluginConfigSchemaSchema.safeParse({
        type: "object",
        properties: { rows: { type: "integer", minimum: 1, default: 0 } },
      }).success,
    ).toBe(false);
    expect(
      pluginConfigSchemaSchema.safeParse({
        type: "object",
        properties: { name: { type: "string", pattern: "(a+)+$" } },
      }).success,
    ).toBe(false);
    expect(
      pluginConfigSchemaSchema.safeParse({
        type: "object",
        properties: {},
        required: ["missing"],
      }).success,
    ).toBe(false);
  });

  it("validates strictly on save, with defaults", () => {
    expect(validatePluginConfig(schema, { rows: 3, extra: 1 })).toEqual({
      success: true,
      data: { greeting: "Hi", rows: 3, show: true },
    });
    const bad = validatePluginConfig(schema, { rows: 11, mode: "c", admins: ["a", "b", "c", "d"] });
    expect(bad.success).toBe(false);
    if (bad.success) return;
    expect(bad.issues.map((i) => i.path)).toEqual(["rows", "mode", "admins"]);
  });

  it("falls back field by field on load", () => {
    const { data, issues } = coercePluginConfig(schema, { rows: "many", greeting: "Yo" });
    expect(data).toEqual({ greeting: "Yo", rows: 5, show: true });
    expect(issues).toEqual([{ path: "rows", message: "Must be a number" }]);
  });

  it("never shows secrets and keeps them when the form leaves them empty", () => {
    expect(maskSecrets(schema, { greeting: "Hi", apiKey: "s3cret" })).toEqual({
      config: { greeting: "Hi" },
      setSecrets: ["apiKey"],
    });
    expect(mergeSecrets(schema, { apiKey: "s3cret" }, { greeting: "Hi", apiKey: "" })).toEqual({
      greeting: "Hi",
      apiKey: "s3cret",
    });
    expect(mergeSecrets(schema, { apiKey: "s3cret" }, { greeting: "Hi" }, ["apiKey"])).toEqual({
      greeting: "Hi",
    });
  });
});
