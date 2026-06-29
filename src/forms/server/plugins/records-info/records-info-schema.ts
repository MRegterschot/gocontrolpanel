import z from "zod";

export const RecordsInfoPluginSchema = z.object({
  localRecordText: z.string().optional(),
});

export type RecordsInfoPluginSchemaType = z.infer<
  typeof RecordsInfoPluginSchema
>;
