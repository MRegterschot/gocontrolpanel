import z from "zod";

export const ExportMatchSchema = z.object({
  filename: z.string().optional(),
  headers: z.array(z.string()),
  values: z.array(z.string()),
});

export type ExportMatchSchemaType = z.infer<typeof ExportMatchSchema>;
