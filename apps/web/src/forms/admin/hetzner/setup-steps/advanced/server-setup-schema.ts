import z from "zod";
import { DatabaseSchema } from "./database-schema";
import { NetworkSchema } from "./network-schema";
import { ServerControllerSchema } from "./server-controller-schema";
import { ServerSchema } from "./server-schema";

export const AdvancedServerSetupSchema = z.object({
  server: ServerSchema,
  serverController: ServerControllerSchema.optional(),
  database: DatabaseSchema.optional(),
  network: NetworkSchema.optional(),
  createServer: z.boolean(),
  groupId: z.string(),
  updateServer: z.boolean(),
  serverId: z.string(),
});

export type AdvancedServerSetupSchemaType = z.infer<
  typeof AdvancedServerSetupSchema
>;
