import { chatConfigSchema } from "@tmcontrolpanel/shared";
import { z } from "zod";

// Server-side schemas for the admin Server Actions. TypeScript types don't exist at runtime, so
// every action parses its input here and builds its Prisma data from the parsed fields only.

const id = z.string().min(1).max(64);
const name = z.string().trim().min(1).max(255);
const description = z.string().max(2000);
const permissionList = z.array(z.string().min(1).max(200)).max(500);

const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Must be an http(s) URL");

const userServer = z
  .object({ userId: id, role: z.enum(["Admin", "Moderator", "Member"]) })
  .strict();

const serverFields = {
  name,
  description: description.optional(),
  host: z.string().trim().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535),
  user: z.string().trim().min(1).max(255),
  userServers: z.array(userServer).max(500).optional(),
  // "" removes the file manager
  filemanagerUrl: z
    .union([z.literal(""), httpUrl])
    .nullable()
    .optional(),
};

export const createServerInput = z
  .object({
    ...serverFields,
    password: z.string().min(1).max(255),
    filemanagerPassword: z.string().max(1000).nullable().optional(),
  })
  .strict();

// Empty or missing passwords keep the stored value
export const updateServerInput = z
  .object({
    ...serverFields,
    name: name.optional(),
    host: serverFields.host.optional(),
    port: serverFields.port.optional(),
    user: serverFields.user.optional(),
    password: z.string().max(255).optional(),
    filemanagerPassword: z.string().max(1000).nullable().optional(),
  })
  .strict();

export const chatConfigInput = chatConfigSchema.strict();

const groupMember = z
  .object({
    userId: id,
    role: z.enum(["Admin", "Moderator", "Member"]),
    order: z.number().int().min(0).max(100_000).optional(),
    serversOrder: z.string().max(100_000).nullable().optional(),
  })
  .strict();

const groupFields = {
  name,
  description: description.optional(),
  public: z.boolean(),
  shareRecords: z.boolean(),
  groupServers: z
    .array(z.object({ serverId: id }).strict())
    .max(500)
    .optional(),
  groupMembers: z.array(groupMember).max(1000).optional(),
};

export const createGroupInput = z.object(groupFields).strict();

export const updateGroupInput = z
  .object({
    ...groupFields,
    name: name.optional(),
    public: z.boolean().optional(),
    shareRecords: z.boolean().optional(),
  })
  .strict();

export const updateUserInput = z
  .object({ admin: z.boolean(), permissions: permissionList })
  .strict();

export const roleInput = z
  .object({
    name,
    description: description.nullable().optional(),
    permissions: permissionList,
  })
  .strict();

const projectUser = z
  .object({ userId: id, role: z.enum(["Admin", "Moderator"]) })
  .strict();

export const createProjectInput = z
  .object({
    name,
    apiTokens: z.array(z.string().trim().min(1).max(500)).max(50).optional(),
    hetznerProjectUsers: z.array(projectUser).max(500).optional(),
  })
  .strict();

export const updateProjectInput = createProjectInput
  .extend({ name: name.optional() })
  .strict();

// Parses an action's input; a bad request becomes a ValidationError for the caller
export function parseInput<S extends z.ZodType>(
  schema: S,
  input: unknown,
): z.output<S> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const error = new Error(
      parsed.error.issues
        .map((i) => `${i.path.join(".") || "input"}: ${i.message}`)
        .join("; "),
    );
    error.name = "ValidationError";
    throw error;
  }
  return parsed.data;
}
