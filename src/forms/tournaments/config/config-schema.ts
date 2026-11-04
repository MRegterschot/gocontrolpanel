import { ServerConfigSchema } from "@/types/tm-server-manager/config";
import z from "zod";

export const ConfigFormSchema = z.object({
  name: z.string().min(1, "Name cannot be empty"),
  config: ServerConfigSchema,
});

export type ConfigFormSchemaType = z.infer<typeof ConfigFormSchema>;
