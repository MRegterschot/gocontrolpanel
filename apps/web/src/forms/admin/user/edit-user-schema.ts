import { z } from "zod";

export const EditUserSchema = z.object({
  admin: z.boolean(),
  role: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export type EditUserSchemaType = z.infer<typeof EditUserSchema>;
