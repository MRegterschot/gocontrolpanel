import { ServerConfigSchema } from "@/types/tm-tourney-manager/config";
import z from "zod";

export const CreateMatchTemplateSchema = z.object({
  name: z.string().min(1, "Name cannot be empty"),
  config: ServerConfigSchema,
});

export type CreateMatchTemplateSchemaType = z.infer<typeof CreateMatchTemplateSchema>;
