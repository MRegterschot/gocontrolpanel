import z from "zod";

export const EditCompetitionSchema = z.object({
  name: z.string().min(1, { message: "Competition name is required" }),
});

export type EditCompetitionSchemaType = z.infer<typeof EditCompetitionSchema>;
