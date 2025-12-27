import z from "zod";

export const EditTournamentDescriptionSchema = z.object({
  description: z.string().max(5000).nullable(),
});

export type EditTournamentDescriptionSchemaType = z.infer<
  typeof EditTournamentDescriptionSchema
>;
