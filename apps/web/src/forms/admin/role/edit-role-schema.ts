import { z } from "zod";

export const EditRoleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export type EditRoleSchemaType = z.infer<typeof EditRoleSchema>;
