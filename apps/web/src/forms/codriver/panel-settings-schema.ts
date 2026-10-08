import { z } from "zod";

export const PanelSettingsSchema = z.object({
  enabled: z.boolean(),
  sharedKeyModels: z
    .array(z.enum(["haiku", "sonnet"]))
    .min(1, "Select at least one model"),
  // Dollars; empty means no limit
  sharedBudgetDollars: z.union([
    z.literal(""),
    z.number().min(0, "Must be 0 or more").max(1_000_000),
  ]),
  allowServerKeys: z.boolean(),
  userMode: z.enum(["everyone", "allowlist"]),
  retentionDays: z
    .number({ message: "Enter a number of days" })
    .int("Must be a whole number")
    .min(1, "At least 1 day")
    .max(3650, "At most 3650 days"),
});

export type PanelSettingsSchemaType = z.infer<typeof PanelSettingsSchema>;
