import { z } from "zod";

export const AddRoleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export type AddRoleSchemaType = z.infer<typeof AddRoleSchema>;
