import z from "zod";

export const CreateTournamentSchema = z
  .object({
    name: z.string().min(1, { message: "Tournament name is required" }),
    description: z.string().optional(),
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"], // attach the error to the endDate field
  });

export type CreateTournamentSchemaType = z.infer<typeof CreateTournamentSchema>;
