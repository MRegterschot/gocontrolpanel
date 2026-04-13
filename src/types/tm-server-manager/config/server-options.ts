import z from "zod";

export const ConfigServerOptionsSchema = z.object({});

export type ConfigServerOptionsSchemaType = z.infer<typeof ConfigServerOptionsSchema>;
