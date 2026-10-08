import { z } from "zod";

export const ServerCodriverSettingsSchema = z.object({
  enabled: z.boolean(),
  model: z.enum(["haiku", "sonnet"]),
  escalation: z.boolean(),
  guestAccess: z.enum(["off", "read"]),
  memberAccess: z.boolean(),
  cooldownSeconds: z
    .number({ invalid_type_error: "Enter a number" })
    .int("Must be a whole number")
    .min(0)
    .max(300),
  memoryTurns: z
    .number({ invalid_type_error: "Enter a number" })
    .int("Must be a whole number")
    .min(0)
    .max(10),
  // Dollars; empty means no limit
  monthlyBudgetDollars: z.union([
    z.literal(""),
    z.number({ invalid_type_error: "Enter a number" }).min(0).max(1_000_000),
  ]),
});

export type ServerCodriverSettingsType = z.infer<
  typeof ServerCodriverSettingsSchema
>;
