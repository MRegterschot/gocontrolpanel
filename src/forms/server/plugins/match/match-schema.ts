import z from "zod";

const PickAndBanOrderSchema = z.array(
  z.union([
    z.object({
      action: z.literal("pick"),
      seed: z.number(),
    }),
    z.object({
      action: z.literal("ban"),
      seed: z.number(),
    }),
    z.object({
      action: z.literal("random"),
    }),
  ]),
);

export const MatchPluginSchema = z.object({
  admins: z
    .array(
      z.object({
        login: z.string(),
      }),
    )
    .optional(),
  maps: z
    .array(
      z.object({
        filename: z.string(),
      }),
    )
    .optional(),
  pickAndBan: z
    .object({
      order: PickAndBanOrderSchema,
      players: z.array(
        z.object({
          login: z.string(),
          seed: z.number(),
        }),
      ),
    })
    .optional(),
  script: z.string().optional(),
  matchSettings: z.string().optional(),
});

export type MatchPluginPickAndBanOrder = z.infer<typeof PickAndBanOrderSchema>;
export type MatchPluginSchemaType = z.infer<typeof MatchPluginSchema>;
