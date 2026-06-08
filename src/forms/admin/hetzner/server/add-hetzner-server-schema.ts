import { z } from "zod";

export const hetznerServerNameSchema = z
  .string()
  .min(1, { message: "Server name is required" })
  .max(253, { message: "Server name must be at most 253 characters" })
  .regex(
    /^(?!-)[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/,
    {
      message:
        "Invalid server name: must be lowercase letters, digits, dashes, and dots; must start and end with a letter or digit.",
    },
  );

export const hetznerServerNameOrEmpty = z.union([
  z.literal(""),
  hetznerServerNameSchema,
]);

export const AddHetznerServerSchema = z.object({
  name: hetznerServerNameSchema,
  serverType: z.string().min(1, { message: "Server type is required" }),
  location: z.string().min(1, { message: "Location is required" }),
  sshKeys: z.array(z.string()).optional(),
  dediLogin: z.string().min(1, { message: "Dedi login is required" }),
  dediPassword: z.string().min(1, { message: "Dedi password is required" }),
  roomPassword: z.string().optional(),
  superAdminPassword: z.string().optional(),
  adminPassword: z.string().optional(),
  userPassword: z.string().optional(),
  filemanagerPassword: z.string().optional(),
});

export type AddHetznerServerSchemaType = z.infer<typeof AddHetznerServerSchema>;
