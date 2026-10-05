import { describe, expect, it } from "vitest";
import { ECMPluginSchema } from "../src/forms/server/plugins/ecm/ecm-schema";
import { MatchPluginSchema } from "../src/forms/server/plugins/match/match-schema";
import { PlayerInfoPluginSchema } from "../src/forms/server/plugins/player-info/player-info-schema";

const selections = [
  {
    name: "ECM editors",
    schema: ECMPluginSchema,
    config: (login: string) => ({ editors: [{ login }] }),
  },
  {
    name: "player info",
    schema: PlayerInfoPluginSchema,
    config: (login: string) => ({ playerInfos: [{ login }] }),
  },
  {
    name: "match admins",
    schema: MatchPluginSchema,
    config: (login: string) => ({ admins: [{ login }] }),
  },
  {
    name: "match players",
    schema: MatchPluginSchema,
    config: (login: string) => ({
      pickAndBan: { order: [], players: [{ login, seed: 1 }] },
    }),
  },
  {
    name: "match team players",
    schema: MatchPluginSchema,
    config: (login: string) => ({
      pickAndBan: { order: [], teams: [{ seed: 1, players: [{ login }] }] },
    }),
  },
];

describe("player selection validation", () => {
  it.each(selections)(
    "requires a selected login for $name",
    ({ schema, config }) => {
      const result = schema.safeParse(config(""));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Search for a user and select a result",
        );
        expect(result.error.issues[0].path.at(-1)).toBe("login");
      }
      expect(schema.safeParse(config("selected-player-login")).success).toBe(
        true,
      );
    },
  );

  it("keeps player lists optional", () => {
    expect(ECMPluginSchema.safeParse({ editors: [] }).success).toBe(true);
    expect(PlayerInfoPluginSchema.safeParse({ playerInfos: [] }).success).toBe(
      true,
    );
    expect(
      MatchPluginSchema.safeParse({
        admins: [],
        pickAndBan: { order: [], players: [], teams: [] },
      }).success,
    ).toBe(true);
  });
});
