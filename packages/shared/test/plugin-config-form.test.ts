import { describe, expect, it } from "vitest";
import {
  coercePluginConfig,
  pluginConfigSchemaSchema,
  validatePluginConfig,
  type PluginConfigSchema,
} from "../src/plugins/config-schema";
import { parseManifest } from "../src/plugins/manifest";

const schema: PluginConfigSchema = {
  type: "object",
  properties: {
    maps: { type: "array", items: { type: "string" } },
    setup: {
      type: "object",
      properties: {
        order: { type: "string", widget: "order", maxItemsFrom: "maps" },
        enabled: { type: "boolean", default: false },
        players: {
          type: "array",
          items: {
            type: "object",
            properties: {
              login: { type: "string", widget: "user" },
              seed: { type: "integer", minimum: 1 },
            },
            required: ["login", "seed"],
          },
        },
      },
    },
  },
};

describe("nested registry config forms", () => {
  it("normalizes nested defaults and drops unknown keys", () => {
    expect(
      validatePluginConfig(schema, {
        setup: {
          players: [{ login: "login", seed: 1, extra: "ignored" }],
          extra: true,
        },
      }),
    ).toEqual({
      success: true,
      data: {
        setup: { enabled: false, players: [{ login: "login", seed: 1 }] },
      },
    });
  });
  it("points selection errors at nested user fields", () => {
    const result = validatePluginConfig(schema, {
      setup: { players: [{ login: "", seed: 1 }] },
    });
    expect(result).toEqual({
      success: false,
      issues: [
        {
          path: "setup.players.0.login",
          message: "Search for a user and select a result",
        },
      ],
    });
  });
  it("checks nested order limits against root maps on save and load", () => {
    const config = { maps: ["one", "two"], setup: { order: "p:1,b:2" } };
    expect(coercePluginConfig(schema, config).data.setup).toEqual({
      order: "p:1,b:2",
      enabled: false,
    });
    expect(
      validatePluginConfig(schema, { ...config, maps: ["one"] }).success,
    ).toBe(false);
    expect(
      validatePluginConfig(schema, { ...config, setup: { order: "p:0" } })
        .success,
    ).toBe(false);
  });
  it("loads numeric text from older nested settings while keeping saves strict", () => {
    const config = { setup: { players: [{ login: "login", seed: "2" }] } };
    expect(coercePluginConfig(schema, config).data.setup).toEqual({
      enabled: false,
      players: [{ login: "login", seed: 2 }],
    });
    expect(validatePluginConfig(schema, config).success).toBe(false);
  });
  it("rejects nested secrets, undefined required fields and excessive depth", () => {
    expect(
      pluginConfigSchemaSchema.safeParse({
        type: "object",
        properties: {
          nested: {
            type: "object",
            properties: { key: { type: "string", secret: true } },
          },
        },
      }).success,
    ).toBe(false);
    expect(
      pluginConfigSchemaSchema.safeParse({
        type: "object",
        properties: {
          nested: { type: "object", properties: {}, required: ["missing"] },
        },
      }).success,
    ).toBe(false);
    let nested: unknown = { type: "string" };
    for (let index = 0; index < 100; index++)
      nested = { type: "array", items: nested };
    expect(
      pluginConfigSchemaSchema.safeParse({
        type: "object",
        properties: { nested },
      }).success,
    ).toBe(false);
  });
  it("requires SDK 2 for rich forms while retaining SDK 1 scalar forms", () => {
    const base = {
      slug: "example",
      name: "Example",
      version: "1.0.0",
      author: "Author",
      description: "Example plugin",
      sdk: 1,
    };
    expect(parseManifest({ ...base, configSchema: schema }).success).toBe(
      false,
    );
    expect(
      parseManifest({ ...base, sdk: 2, configSchema: schema }).success,
    ).toBe(true);
    expect(
      parseManifest({
        ...base,
        configSchema: {
          type: "object",
          properties: { greeting: { type: "string" } },
        },
      }).success,
    ).toBe(true);
  });
});
