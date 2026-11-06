import z from "zod";
import { AddHetznerDatabaseSchema } from "../../database/add-hetzner-database-schema";
import { hetznerServerNameOrEmpty } from "../../server/add-hetzner-server-schema";

export const DatabaseSchema = AddHetznerDatabaseSchema.omit({
  name: true,
  serverType: true,
  location: true,
  databaseType: true,
  databaseRootPassword: true,
  databaseUser: true,
  databasePassword: true,
})
  .extend({
    name: hetznerServerNameOrEmpty.optional(),
    serverType: z.string().optional(),
    new: z.boolean().optional(),
    existing: z.string().optional(),
    local: z.boolean().optional(),
    databaseIp: z.string().optional(),
    databaseType: z.string().optional(),
    databaseRootPassword: z.string().optional(),
    databaseUser: z.string().optional(),
    databasePassword: z.string().optional(),
  })
  .refine(
    (data) => {
      return data.new || (data.existing && data.existing.trim() !== "");
    },
    {
      message: "Existing database is required unless creating a new one.",
      path: ["existing"],
    },
  )
  .refine(
    (data) => {
      if (!data.local && !data.existing) {
        return Boolean(data.name) && Boolean(data.serverType);
      }
      return true;
    },
    {
      message:
        "If creating a new database that is not local, a name and serverType is required.",
      path: ["name"],
    },
  );
