import { z } from "zod";

// Colors manialink templates read as {{@theme.quad.*}} and {{@theme.label.*}}, as three-digit hex without "#" (e.g. "DDD")
// Types, not interfaces, so the theme can be stored as JSON
export type ThemePalette = {
  foreground: string;
  background: string;
  foregroundMuted: string;
  backgroundMuted: string;
};

// Quads read their colors from `quad`, labels and entries from `label`
export type ManialinkTheme = {
  quad: ThemePalette;
  label: ThemePalette;
};

export const DEFAULT_PALETTE: ThemePalette = {
  foreground: "DDD",
  background: "222",
  foregroundMuted: "CCC",
  backgroundMuted: "333",
};

export const DEFAULT_THEME: ManialinkTheme = {
  quad: DEFAULT_PALETTE,
  label: DEFAULT_PALETTE,
};

export const THEME_TARGETS = [
  "quad",
  "label",
] as const satisfies readonly (keyof ManialinkTheme)[];

export const THEME_COLORS = [
  "foreground",
  "background",
  "foregroundMuted",
  "backgroundMuted",
] as const satisfies readonly (keyof ThemePalette)[];

const color = z
  .string()
  .trim()
  .regex(/^[0-9a-f]{3}$/i, "Use three hex digits, such as DDD")
  .transform((value) => value.toUpperCase());

export const themePaletteSchema = z.object({
  foreground: color,
  background: color,
  foregroundMuted: color,
  backgroundMuted: color,
});

export const manialinkThemeSchema = z.object({
  quad: themePaletteSchema,
  label: themePaletteSchema,
});

// A stored theme, or null when it is missing or no longer valid
export function parseTheme(value: unknown): ManialinkTheme | null {
  // Themes saved before the quad/label split are one flat palette
  const flat = themePaletteSchema.safeParse(value);
  if (flat.success) return { quad: flat.data, label: { ...flat.data } };
  const result = manialinkThemeSchema.safeParse(value);
  return result.success ? result.data : null;
}

// The server's own theme, else the first of its groups' themes, else the default
export function resolveTheme(
  serverTheme: unknown,
  groupThemes: unknown[] = [],
): ManialinkTheme {
  for (const theme of [serverTheme, ...groupThemes]) {
    const parsed = parseTheme(theme);
    if (parsed) return parsed;
  }
  return DEFAULT_THEME;
}
