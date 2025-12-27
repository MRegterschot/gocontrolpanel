import z from "zod";

export const EditRegistrationSettingsSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("None"),
  }),
  z.object({
    type: z.literal("Players"),
    playerLimit: z.coerce.number().int().nonnegative().optional(),
    registrationDeadline: z.date(),
  }),
  z.object({
    type: z.literal("Team"),
    teamLimit: z.coerce.number().int().nonnegative().optional(),
    teamSizeMin: z.number(),
    teamSizeMax: z.number(),
    registrationDeadline: z.date(),
  }),
]);

export type EditRegistrationSettingsSchemaType = z.infer<
  typeof EditRegistrationSettingsSchema
>;
