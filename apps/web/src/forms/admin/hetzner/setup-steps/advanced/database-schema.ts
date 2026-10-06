import z from "zod";
import { AddHetznerDatabaseSchema } from "../../database/add-hetzner-database-schema";
import { hetznerServerNameOrEmpty } from "../../server/add-hetzner-server-schema";

export const DatabaseSchema = AddHetznerDatabaseSchema.omit({
  name: true,
  serverType: true,
  location: true,
})
  .extend({
    name: hetznerServerNameOrEmpty.optional(),
    serverType: z.string().optional(),
    location: z.string().optional(),
    new: z.boolean().optional(),
    existing: z.string().optional(),
    local: z.boolean().optional(),
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
        return Boolean(data.name && data.serverType && data.location);
      }
      return true;
    },
    {
      message:
        "If creating a new database that is not local, a name, server type and location is required.",
      path: ["name"],
    },
  );
