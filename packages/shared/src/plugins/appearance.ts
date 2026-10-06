import { z } from "zod";

// Only presentation attributes. Identity, actions, URLs and scripts are never editable here.
export const MANIALINK_STYLE_ATTRIBUTES = [
  "textfont",
  "textsize",
  "textcolor",
  "textemboss",
  "textshadow",
  "textscale",
  "autonewline",
  "maxline",
  "linespacing",
  "opacity",
  "bgcolor",
  "bgcolorfocus",
  "focusareacolor1",
  "focusareacolor2",
  "pos",
  "size",
  "scale",
  "rot",
  "z-index",
  "halign",
  "valign",
  "style",
  "substyle",
  "styleselected",
  "hidden",
  "keepratio",
] as const;
export type ManialinkStyleAttribute =
  (typeof MANIALINK_STYLE_ATTRIBUTES)[number];
export const MANIALINK_STYLE_ELEMENTS = [
  "*",
  "label",
  "quad",
  "frame",
  "entry",
  "gauge",
  "frameinstance",
] as const;

const value = z
  .string()
  .max(128)
  .refine(
    (v) => !/[\u0000-\u001f]/.test(v),
    "Control characters are not allowed",
  );
const numeric = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;
function validAttributeValue(name: string, v: string): boolean {
  if (["pos", "size"].includes(name)) {
    const parts = v.trim().split(/\s+/);
    return (
      parts.length === 2 &&
      parts.every(
        (n) =>
          numeric.test(n) &&
          Math.abs(Number(n)) <= 10000 &&
          (name !== "size" || Number(n) >= 0),
      )
    );
  }
  if (
    [
      "textsize",
      "textscale",
      "scale",
      "opacity",
      "rot",
      "z-index",
      "linespacing",
      "maxline",
    ].includes(name)
  ) {
    if (!numeric.test(v) || Math.abs(Number(v)) > 10000) return false;
    if (name === "opacity") return Number(v) >= 0 && Number(v) <= 1;
    if (name === "maxline")
      return Number.isInteger(Number(v)) && Number(v) >= 0;
    return ["rot", "z-index", "linespacing"].includes(name) || Number(v) >= 0;
  }
  if (
    [
      "textcolor",
      "bgcolor",
      "bgcolorfocus",
      "focusareacolor1",
      "focusareacolor2",
    ].includes(name)
  )
    return /^(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(v);
  if (["hidden", "autonewline", "textemboss", "textshadow"].includes(name))
    return ["0", "1"].includes(v);
  if (name === "halign") return ["left", "center", "right"].includes(v);
  if (name === "valign")
    return ["top", "center", "center2", "bottom"].includes(v);
  if (name === "keepratio") return ["Inactive", "Clip", "Fit"].includes(v);
  return true;
}

const appearanceRuleSchema = z
  .object({
    // Blank means every page. Names are SDK widget/window ids without the plugin prefix.
    page: z
      .string()
      .max(100)
      .regex(/^[a-zA-Z0-9_-]*$/),
    element: z.enum(MANIALINK_STYLE_ELEMENTS),
    id: z.string().max(128),
    className: z.string().max(128).regex(/^\S*$/, "Use one class name"),
    attributes: z
      .record(z.enum(MANIALINK_STYLE_ATTRIBUTES), value)
      .superRefine((attributes, ctx) => {
        if (Object.keys(attributes).length === 0)
          ctx.addIssue({
            code: "custom",
            message: "Add at least one appearance property",
          });
        for (const [name, v] of Object.entries(attributes)) {
          if (v !== undefined && !validAttributeValue(name, v))
            ctx.addIssue({
              code: "custom",
              path: [name],
              message: `Invalid ${name} value`,
            });
        }
      }),
  })
  .strict();

export const pluginAppearanceSchema = z
  .object({ rules: z.array(appearanceRuleSchema).max(50) })
  .strict();
export type PluginAppearance = z.infer<typeof pluginAppearanceSchema>;
export type PluginAppearanceRule = PluginAppearance["rules"][number];

// Server-wide theme options, applied in this order as rules before any other rule.
// The window classes are set by the SDK window template.
export const APPEARANCE_THEME_OPTIONS = [
  { key: "font", element: "label", className: "", attribute: "textfont" },
  { key: "textColor", element: "label", className: "", attribute: "textcolor" },
  { key: "textScale", element: "label", className: "", attribute: "textscale" },
  {
    key: "lineSpacing",
    element: "label",
    className: "",
    attribute: "linespacing",
  },
  {
    key: "windowTitleBarColor",
    element: "quad",
    className: "window-titlebar",
    attribute: "bgcolor",
  },
  {
    key: "windowTitleColor",
    element: "label",
    className: "window-title",
    attribute: "textcolor",
  },
  {
    key: "windowBackgroundColor",
    element: "quad",
    className: "window-body",
    attribute: "bgcolor",
  },
] as const satisfies readonly {
  key: string;
  element: (typeof MANIALINK_STYLE_ELEMENTS)[number];
  className: string;
  attribute: ManialinkStyleAttribute;
}[];
export type AppearanceThemeKey =
  (typeof APPEARANCE_THEME_OPTIONS)[number]["key"];

export const serverAppearanceSchema = z
  .object({
    // Empty strings mean unset, so cleared form fields save cleanly
    theme: z
      .record(
        z.enum(
          APPEARANCE_THEME_OPTIONS.map((o) => o.key) as [
            AppearanceThemeKey,
            ...AppearanceThemeKey[],
          ],
        ),
        value,
      )
      .superRefine((theme, ctx) => {
        for (const option of APPEARANCE_THEME_OPTIONS) {
          const v = theme[option.key];
          if (v && !validAttributeValue(option.attribute, v))
            ctx.addIssue({
              code: "custom",
              path: [option.key],
              message: `Invalid ${option.attribute} value`,
            });
        }
      }),
    rules: z.array(appearanceRuleSchema).max(50),
  })
  .strict();
export type ServerAppearance = z.infer<typeof serverAppearanceSchema>;

export function readServerAppearance(raw: unknown): ServerAppearance {
  const result = serverAppearanceSchema.safeParse(raw);
  return result.success ? result.data : { theme: {}, rules: [] };
}

export function themeRules(
  theme: ServerAppearance["theme"],
): PluginAppearanceRule[] {
  return APPEARANCE_THEME_OPTIONS.flatMap((option) => {
    const v = theme[option.key];
    return v
      ? [
          {
            page: "",
            element: option.element,
            id: "",
            className: option.className,
            attributes: { [option.attribute]: v },
          },
        ]
      : [];
  });
}

// Theme options first, so the server's own rules win for the same property
export function effectiveAppearance(
  server: ServerAppearance,
): PluginAppearance {
  return { rules: [...themeRules(server.theme), ...server.rules] };
}
