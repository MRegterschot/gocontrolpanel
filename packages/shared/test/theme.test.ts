import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, parseTheme, resolveTheme } from "../src";

const palette = (c: string) => ({
  foreground: c,
  background: c,
  foregroundMuted: c,
  backgroundMuted: c,
});
const theme = (quad: string, label = quad) => ({
  quad: palette(quad),
  label: palette(label),
});

describe("manialink themes", () => {
  it("normalizes valid colors and refuses invalid ones", () => {
    expect(parseTheme(theme("abc"))).toEqual(theme("ABC"));
    expect(parseTheme(theme("#abc"))).toBeNull();
    expect(parseTheme(theme("abcd"))).toBeNull();
    expect(parseTheme(theme("abc", "def"))).toEqual(theme("ABC", "DEF"));
    expect(parseTheme({ quad: palette("abc") })).toBeNull();
    expect(parseTheme({ foreground: "FFF" })).toBeNull();
    expect(parseTheme(null)).toBeNull();
  });

  it("reads a flat palette saved before the split as both palettes", () => {
    expect(parseTheme(palette("abc"))).toEqual(theme("ABC"));
  });

  it("prefers the server, then the first group with a theme, then the default", () => {
    expect(resolveTheme(theme("111"), [theme("222")])).toEqual(theme("111"));
    expect(resolveTheme(null, [null, theme("222"), theme("333")])).toEqual(
      theme("222"),
    );
    expect(resolveTheme({ broken: true }, [])).toEqual(DEFAULT_THEME);
  });
});
