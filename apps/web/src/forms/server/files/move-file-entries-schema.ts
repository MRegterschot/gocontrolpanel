import { z } from "zod";

export const MoveFileEntriesSchema = z.object({
  items: z
    .array(
      z.object({
        from: z.string().min(1, "Source is required"),
        to: z.string().min(1, "Destination is required"),
      }),
    )
    .min(1, "Nothing to move"),
});

export type MoveFileEntriesSchemaType = z.infer<typeof MoveFileEntriesSchema>;

// The form edits one destination string: a full path for one item, a folder for several
export const MoveFileEntriesFormSchema = z.object({
  destination: z.string().trim().min(1, "Destination is required"),
});

export type MoveFileEntriesFormSchemaType = z.infer<
  typeof MoveFileEntriesFormSchema
>;
