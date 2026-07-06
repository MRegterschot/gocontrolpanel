import { z } from "zod";

export const AdvancedActionsSchema = z.object({
  login: z.string().min(1, "Login is required"),
});

export type AdvancedActionsSchemaType = z.infer<typeof AdvancedActionsSchema>;
