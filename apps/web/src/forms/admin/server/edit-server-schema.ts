import { z } from "zod";

export const EditServerSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  description: z.string().optional(),
  host: z.string().min(1, { message: "Host is required" }),
  port: z.coerce.number().min(1, { message: "Port must be greater than 0" }),
  user: z.string().min(1, { message: "User is required" }),
  password: z.string().min(1, { message: "Password is required" }),
  userServers: z
    .array(
      z.object({
        userId: z.string().uuid("Please select the found user"),
        role: z.string().min(1, "Role is required"),
      }),
    )
    .optional()
    .describe("List of users with their roles on the server"),
  filemanagerUrl: z.string().optional(),
  filemanagerPassword: z.string().optional(),
});

export type EditServerSchemaType = z.infer<typeof EditServerSchema>;
