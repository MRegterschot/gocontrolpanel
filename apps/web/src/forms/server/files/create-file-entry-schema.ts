import { z } from "zod";

export const CreateFileEntrySchema = z.object({
  path: z.string().min(1, "Path is required"),
  isDir: z.boolean(),
  content: z.string().optional(),
});

export type CreateFileEntrySchemaType = z.infer<typeof CreateFileEntrySchema>;
