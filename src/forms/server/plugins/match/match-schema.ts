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
      type: z.union([z.literal("player"), z.literal("team")]),
      order: PickAndBanOrderSchema,
      teams: z
        .array(
          z.object({
            seed: z.number(),
            players: z.array(z.object({ login: z.string() })),
          }),
        )
        .optional(),
      players: z
        .array(
          z.object({
            login: z.string(),
            seed: z.number(),
          }),
        )
        .optional(),
    })
    .optional(),
  script: z.string().optional(),
  lobby: z
    .object({
      script: z.string().optional(),
      map: z.string().optional(),
    })
    .optional(),
});

export type MatchPluginPickAndBanOrder = z.infer<typeof PickAndBanOrderSchema>;
export type MatchPluginSchemaType = z.infer<typeof MatchPluginSchema>;
