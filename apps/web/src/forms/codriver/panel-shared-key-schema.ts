import { z } from "zod";

export const PanelSharedKeySchema = z.object({
  key: z.string().trim().min(20, "That does not look like an API key").max(300),
});

export type PanelSharedKeySchemaType = z.infer<typeof PanelSharedKeySchema>;
