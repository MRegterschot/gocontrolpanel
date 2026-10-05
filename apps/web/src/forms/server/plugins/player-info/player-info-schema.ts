import z from "zod";

export const PlayerInfoPluginSchema = z.object({
  playerInfos: z
    .array(
      z.object({
        login: z.string().min(1, "Search for a user and select a result"),
        device: z.string().optional(),
        camera: z.string().optional(),
      }),
    )
    .optional(),
});

export type PlayerInfoPluginSchemaType = z.infer<typeof PlayerInfoPluginSchema>;
