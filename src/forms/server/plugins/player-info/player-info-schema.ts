import z from "zod";

export const PlayerInfoPluginSchema = z.object({
  playerInfos: z
    .array(
      z.object({
        login: z.string(),
        device: z.string().optional(),
        camera: z.string().optional(),
      }),
    )
    .optional(),
});

export type PlayerInfoPluginSchemaType = z.infer<typeof PlayerInfoPluginSchema>;
