import z from "zod";

const NodeHandleSchema = z.object({
  tag: z.enum(["MatchV1"]),
  value: z.number(),
});

export const CreateConnectionSchema = z.object({
  origin: z.discriminatedUnion("tag", [NodeHandleSchema]),
  target: z.discriminatedUnion("tag", [NodeHandleSchema]),
  kind: z.object({
    tag: z.enum(["Wait", "Data", "Action"]),
  }),
});

export type CreateConnectionSchemaType = z.infer<typeof CreateConnectionSchema>;
