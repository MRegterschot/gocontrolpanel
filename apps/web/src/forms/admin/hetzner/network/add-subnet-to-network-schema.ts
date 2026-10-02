import z from "zod";

export const AddSubnetToNetworkSchema = z.object({
  type: z.enum(["cloud", "server"]),
  ipRange: z.string().optional(),
  networkZone: z.string(),
});

export type AddSubnetToNetworkSchemaType = z.infer<
  typeof AddSubnetToNetworkSchema
>;
