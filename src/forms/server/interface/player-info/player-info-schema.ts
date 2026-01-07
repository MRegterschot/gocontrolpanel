import z from "zod";

export const PlayerInfoPluginSchema = z.object({
  playerInfos: z
    .array(
      z.object({
        login: z.string(),
      }),
    )
    .optional(),
});

export type PlayerInfoPluginSchemaType = z.infer<typeof PlayerInfoPluginSchema>;
