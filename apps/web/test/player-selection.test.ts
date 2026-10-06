import { validatePluginConfig, type PluginConfigSchema } from "@gcp/shared";
import { describe, expect, it } from "vitest";

const schema: PluginConfigSchema = {
  type: "object",
  properties: {
    users: {
      type: "array",
      items: { type: "string", widget: "user", minLength: 1 },
    },
    players: {
      type: "array",
      items: {
        type: "object",
        properties: { login: { type: "string", widget: "user", minLength: 1 } },
        required: ["login"],
      },
    },
  },
};

describe("registry user selection validation", () => {
  it.each([{ users: [""] }, { players: [{ login: "" }] }])(
    "rejects an unselected user row: %j",
    (config) => {
      const result = validatePluginConfig(schema, config);
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.issues[0].message).toBe(
          "Search for a user and select a result",
        );
    },
  );
  it("accepts selected logins and optional empty lists", () => {
    expect(
      validatePluginConfig(schema, {
        users: ["selected-login"],
        players: [{ login: "selected-login" }],
      }).success,
    ).toBe(true);
    expect(
      validatePluginConfig(schema, { users: [], players: [] }).success,
    ).toBe(true);
  });
});
