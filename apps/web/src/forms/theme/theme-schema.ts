import { z } from "zod";

const color = z
  .string()
  .trim()
  .regex(/^[0-9a-f]{3}$/i, "Use three hex digits, such as DDD");

const palette = z.object({
  foreground: color,
  background: color,
  foregroundMuted: color,
  backgroundMuted: color,
});

export const ThemeSchema = z.object({ quad: palette, label: palette });

export type ThemeSchemaType = z.infer<typeof ThemeSchema>;
