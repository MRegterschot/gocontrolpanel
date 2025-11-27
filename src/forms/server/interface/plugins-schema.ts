import z from "zod";

export const PluginsSchema = z.object({
  admin: z.boolean().optional(),
  ecm: z.boolean().optional(),
  "map-info": z.boolean().optional(),
  "records-info": z.boolean().optional(),
  "live-ranking": z.boolean().optional(),
  "live-round": z.boolean().optional(),
  "ta-leaderboard": z.boolean().optional(),
  "ta-active-runs": z.boolean().optional(),
});

export type PluginsSchemaType = z.infer<typeof PluginsSchema>;
