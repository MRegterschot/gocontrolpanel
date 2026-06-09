import z from "zod";

export const ECMPluginSchema = z.object({
  apiKey: z
    .string()
    .optional()
    .refine(
      (val) => !val || (val.match(/_/g)?.length ?? 0) === 1,
      "API key must contain one underscore",
    ),
  isRecording: z.boolean().optional(),
  editors: z
    .array(
      z.object({
        login: z.string(),
      }),
    )
    .optional(),
});

export type ECMPluginSchemaType = z.infer<typeof ECMPluginSchema>;
