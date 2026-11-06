import { z } from "zod";
import { AddHetznerNetworkSchema } from "../../network/add-hetzner-network-schema";

export const NetworkSchema = AddHetznerNetworkSchema.extend({
  new: z.boolean().optional(),
  existing: z.string().optional(),
  databaseIp: z.string().optional(),
  databaseInNetwork: z.boolean().optional(),
}).superRefine((data, ctx) => {
  const { new: isNew, existing } = data;

  if (!isNew && (!existing || existing.trim() === "")) {
    ctx.addIssue({
      path: ["existing"],
      code: z.ZodIssueCode.custom,
      message: "Existing network must be selected unless creating a new one.",
    });
  }
});
