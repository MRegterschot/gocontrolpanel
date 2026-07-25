import z from "zod";
import { DatabaseSchema } from "./database-schema";
import { ServerControllerSchema } from "./server-controller-schema";
import { ServerSchema } from "./server-schema";

export const SimpleServerSetupSchema = z.object({
  server: ServerSchema,
  serverController: ServerControllerSchema.optional(),
  database: DatabaseSchema.optional(),
  createServer: z.boolean(),
  groupId: z.string(),
});

export type SimpleServerSetupSchemaType = z.infer<
  typeof SimpleServerSetupSchema
>;
