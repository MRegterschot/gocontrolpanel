import z from "zod";

export const CreateConnectionSchema = z.object({
  kind: z.object({
    tag: z.enum(["Wait", "Data", "Action"]),
  }),
});

export type CreateConnectionSchemaType = z.infer<typeof CreateConnectionSchema>;
