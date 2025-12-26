import z from "zod";

export const CreateCompetitionSchema = z.object({
  name: z.string().min(1, { message: "Competition name is required" }),
  parentId: z.number().int().nonnegative(),
  withTemplate: z.number().int().nonnegative().optional(),
});

export type CreateCompetitionSchemaType = z.infer<
  typeof CreateCompetitionSchema
>;
