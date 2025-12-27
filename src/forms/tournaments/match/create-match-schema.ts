import z from "zod";

export const CreateMatchSchema = z.object({
  competitionId: z.number().int().nonnegative(),
  withTemplate: z.number().int().nonnegative().optional(),
});

export type CreateMatchSchemaType = z.infer<typeof CreateMatchSchema>;
