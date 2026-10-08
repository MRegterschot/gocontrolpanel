import { z } from "zod";

export const PanelRuleSchema = z.object({
  targetType: z.enum(["server", "group", "user"]),
  targetId: z.string().min(1, "Choose a target"),
  effect: z.enum(["allow", "deny"]),
  useSharedKey: z.boolean(),
  // Dollars per server and month; empty means no limit
  budgetDollars: z.union([
    z.literal(""),
    z.number().min(0, "Must be 0 or more").max(1_000_000),
  ]),
});

export type PanelRuleSchemaType = z.infer<typeof PanelRuleSchema>;
