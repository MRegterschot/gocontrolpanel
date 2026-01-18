import z from "zod";

export const CreateMatchSchema = z.object({
  name: z.string(),
  competitionId: z.number().int().nonnegative(),
  withTemplate: z.coerce.number().int().optional(),
});

export type CreateMatchSchemaType = z.infer<typeof CreateMatchSchema>;
