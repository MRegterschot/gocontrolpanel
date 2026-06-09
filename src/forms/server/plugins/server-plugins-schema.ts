import z from "zod";

export const ServerPluginsSchema = z.object({
  scriptName: z.string().optional(),
});

export type ServerPluginsSchemaType = z.infer<typeof ServerPluginsSchema>;
