import { z } from "zod";

export const RegisterPlayerSchema = z.object({
  player: z.string(),
});

export type RegisterPlayerSchemaType = z.infer<typeof RegisterPlayerSchema>;
