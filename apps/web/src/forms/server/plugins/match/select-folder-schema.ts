import z from "zod";

export const SelectFolderSchema = z.object({
  folderPath: z.string().min(1, "Folder path is required"),
});

export type SelectFolderSchemaType = z.infer<typeof SelectFolderSchema>;
