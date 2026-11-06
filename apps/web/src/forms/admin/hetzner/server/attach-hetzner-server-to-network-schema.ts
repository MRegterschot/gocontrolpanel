import z from "zod";

export const AttachHetznerServerToNetworkSchema = z.object({
  networkId: z.string().min(1, "Network ID must be a positive number"),
  ip: z.string().optional(),
});

export type AttachHetznerServerToNetworkSchemaType = z.infer<
  typeof AttachHetznerServerToNetworkSchema
>;
