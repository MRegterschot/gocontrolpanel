import { z } from "zod";

export const ChatConfigSchema = z.object({
  manualRouting: z.boolean(),
  messageFormat: z.string().optional(),
  connectMessage: z.string().optional(),
  disconnectMessage: z.string().optional(),
  scriptNameChangeMessage: z.string().optional(),
  matchSettingsLoadedMessage: z.string().optional(),
  scriptSettingsSavedMessage: z.string().optional(),
  mapListChangeMessage: z.string().optional(),
});

export type ChatConfigSchemaType = z.infer<typeof ChatConfigSchema>;
