import z from "zod";

export const CreateMatchSchema = z.object({
  name: z.string(),
  parentId: z.number().int().nonnegative(),
  withTemplate: z.coerce.number().int(),
});

export type CreateMatchSchemaType = z.infer<typeof CreateMatchSchema>;
