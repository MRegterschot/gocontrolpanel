import z from "zod";

export const LiveRoundPluginSchema = z.object({
  localRecordText: z.string().optional(),
  showPoints: z.boolean().optional(),
  rowCount: z.number().optional(),
});

export type LiveRoundPluginSchemaType = z.infer<typeof LiveRoundPluginSchema>;
