import z from "zod";

export const EditTournamentSchema = z
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

export type EditTournamentSchemaType = z.infer<typeof EditTournamentSchema>;
