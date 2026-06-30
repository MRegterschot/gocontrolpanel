import z from "zod";

export const EditRegistrationSettingsSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("Player"),
    playerLimit: z.coerce.number().int().nonnegative().optional(),
  }),
]);

export type EditRegistrationSettingsSchemaType = z.infer<
  typeof EditRegistrationSettingsSchema
>;
