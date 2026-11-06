import { z } from "zod";

export const AddProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  apiTokens: z
    .array(z.string().min(1, "API token is required"))
    .optional()
    .describe("List of API tokens for the project"),
  hetznerProjectUsers: z
    .array(
      z.object({
        userId: z.string().uuid("Please select the found user"),
        role: z.string().min(1, "Role is required"),
      }),
    )
    .optional()
    .describe("List of users in the project with their roles"),
});

export type AddProjectSchemaType = z.infer<typeof AddProjectSchema>;
