import z from "zod";

export const RemoveSubnetFromNetworkSchema = z.object({
  ipRange: z.string(),
});

export type RemoveSubnetFromNetworkSchemaType = z.infer<
  typeof RemoveSubnetFromNetworkSchema
>;
