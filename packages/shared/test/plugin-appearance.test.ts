import { describe, expect, it } from "vitest";
import {
  effectiveAppearance,
  pluginAppearanceSchema,
  readServerAppearance,
  serverAppearanceSchema,
  themeRules,
} from "../src/plugins/appearance";

const rule = (attributes: Record<string, string | undefined>) => ({
  page: "",
  element: "label",
  id: "",
  className: "",
  attributes,
});

describe("plugin appearance validation", () => {
  it("accepts presentation values and an empty reset", () => {
    expect(
      pluginAppearanceSchema.safeParse({
        rules: [
          rule({
            textfont: "GameFont",
            textsize: "1.5",
            textcolor: "FF8800",
            pos: "-150 60",
            size: "40 10",
            opacity: "0.8",
          }),
        ],
      }).success,
    ).toBe(true);
    expect(pluginAppearanceSchema.parse({ rules: [] })).toEqual({ rules: [] });
  });
  it.each([
    "action",
    "id",
    "class",
    "url",
    "image",
    "scriptevents",
    "script",
    "manialink",
    "text",
  ])("rejects non-presentation attribute %s", (attribute) => {
    expect(
      pluginAppearanceSchema.safeParse({ rules: [rule({ [attribute]: "x" })] })
        .success,
    ).toBe(false);
  });
  it.each([
    { textsize: "NaN" },
    { size: "-1 10" },
    { pos: "1 2 3" },
    { pos: "Infinity 0" },
    { opacity: "2" },
    { textcolor: "#fff" },
    { halign: "middle" },
    { maxline: "2.5" },
    { hidden: "yes" },
  ])("rejects invalid values %j", (attributes) => {
    expect(
      pluginAppearanceSchema.safeParse({ rules: [rule(attributes)] }).success,
    ).toBe(false);
  });
  it("bounds rules and property length and rejects empty rules", () => {
    expect(
      pluginAppearanceSchema.safeParse({
        rules: Array(51).fill(rule({ textsize: "2" })),
      }).success,
    ).toBe(false);
    expect(
      pluginAppearanceSchema.safeParse({
        rules: [rule({ textfont: "a".repeat(129) })],
      }).success,
    ).toBe(false);
    expect(
      pluginAppearanceSchema.safeParse({ rules: [rule({})] }).success,
    ).toBe(false);
  });
});

describe("server appearance", () => {
  const label = (attributes: Record<string, string>) => ({
    page: "",
    element: "label" as const,
    id: "",
    className: "",
    attributes,
  });

  it("validates theme values, allows cleared fields and rejects unknown keys", () => {
    const parse = (raw: unknown) =>
      serverAppearanceSchema.safeParse(raw).success;
    expect(
      parse({
        theme: {
          font: "GameFontBlack",
          textColor: "",
          windowTitleBarColor: "222C",
        },
        rules: [],
      }),
    ).toBe(true);
    expect(parse({ theme: { textColor: "red" }, rules: [] })).toBe(false);
    expect(parse({ theme: { lineSpacing: "abc" }, rules: [] })).toBe(false);
    expect(parse({ theme: { other: "1" }, rules: [] })).toBe(false);
    expect(
      parse({
        theme: {},
        rules: [{ ...label({ textsize: "2" }), path: "0.1" }],
      }),
    ).toBe(false);
    expect(readServerAppearance("garbage")).toEqual({ theme: {}, rules: [] });
  });

  it("applies the theme in a fixed order, then server rules", () => {
    const rules = effectiveAppearance({
      theme: { windowTitleColor: "DDD", font: "Oswald", textColor: "" },
      rules: [label({ textsize: "2" })],
    }).rules;
    expect(rules).toEqual([
      label({ textfont: "Oswald" }),
      { ...label({ textcolor: "DDD" }), className: "window-title" },
      label({ textsize: "2" }),
    ]);
    expect(themeRules({})).toEqual([]);
  });
});
