import z from "zod";

export const CreateTournamentSchema = z.object({
  name: z.string().min(1, { message: "Tournament name is required" }),
});

export type CreateTournamentSchemaType = z.infer<typeof CreateTournamentSchema>;