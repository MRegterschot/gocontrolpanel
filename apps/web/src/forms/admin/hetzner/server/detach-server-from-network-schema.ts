import z from "zod";

export const DetachServerFromNetworkSchema = z.object({
  network: z.string().min(1, "Network ID must be a positive number"),
});

export type DetachServerFromNetworkSchemaType = z.infer<
  typeof DetachServerFromNetworkSchema
>;
