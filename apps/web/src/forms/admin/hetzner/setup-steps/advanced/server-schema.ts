import z from "zod";
import { AddHetznerServerSchema } from "../../server/add-hetzner-server-schema";

export const ServerSchema = AddHetznerServerSchema.extend({
  controller: z.boolean().optional(),
});
