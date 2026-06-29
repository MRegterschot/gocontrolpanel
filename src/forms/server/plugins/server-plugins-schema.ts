import z from "zod";

export const ServerPluginsSchema = z.object({
  scriptName: z.string().optional(),
  settings: z.record(z.union([z.string(), z.number(), z.boolean()])),
});

export type ServerPluginsSchemaType = z.infer<typeof ServerPluginsSchema>;
