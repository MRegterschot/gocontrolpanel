import z from "zod";

export const PluginsSchema = z.object({
  admin: z.object({
    enabled: z.boolean().optional(),
    config: z.object({}).optional(),
  }),
  ecm: z.object({
    enabled: z.boolean().optional(),
    config: z.object({
      apiKey: z
        .string()
        .optional()
        .refine(
          (val) => !val || (val.match(/_/g)?.length ?? 0) === 1,
          "API key must contain one underscore",
        ),
      isRecording: z.boolean().optional(),
      editors: z.array(z.string()).optional(),
    }),
  }),
  "map-info": z.object({
    enabled: z.boolean().optional(),
    config: z.object({}).optional(),
  }),
  "records-info": z.object({
    enabled: z.boolean().optional(),
    config: z.object({}).optional(),
  }),
  "live-ranking": z.object({
    enabled: z.boolean().optional(),
    config: z.object({}).optional(),
  }),
  "live-round": z.object({
    enabled: z.boolean().optional(),
    config: z.object({}).optional(),
  }),
  "ta-leaderboard": z.object({
    enabled: z.boolean().optional(),
    config: z.object({}).optional(),
  }),
  "ta-active-runs": z.object({
    enabled: z.boolean().optional(),
    config: z.object({}).optional(),
  }),
});

export type PluginsSchemaType = z.infer<typeof PluginsSchema>;
