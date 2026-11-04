import z from "zod";

export const CreateMatchSchema = z.object({
  name: z.string().min(1, "Name cannot be empty"),
});

export type CreateMatchSchemaType = z.infer<typeof CreateMatchSchema>;
