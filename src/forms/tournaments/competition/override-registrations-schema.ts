import { z } from "zod";

export const OverrideRegistrationsSchema = z.object({
  players: z
    .array(
      z.object({
        accountId: z.string(),
      }),
    )
    .optional()
    .describe(
      "List of players to override the registrations with. Each player should have an accountId.",
    ),
});

export type OverrideRegistrationsSchemaType = z.infer<
  typeof OverrideRegistrationsSchema
>;
