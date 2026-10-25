import { API_KEY_SCOPES } from "@tmcontrolpanel/shared";
import { z } from "zod";

export const API_KEY_EXPIRY_OPTIONS = [
  { label: "Never", value: "never" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
  { label: "1 year", value: "365" },
] as const;

export const CreateApiKeySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required" })
    .max(100, { message: "Name is too long" }),
  scopes: z
    .array(z.enum(API_KEY_SCOPES))
    .min(1, { message: "Pick at least one scope" }),
  expiresIn: z.enum(["never", "30", "90", "365"]),
});

export type CreateApiKeySchemaType = z.infer<typeof CreateApiKeySchema>;

export const RenameApiKeySchema = CreateApiKeySchema.pick({ name: true });

export type RenameApiKeySchemaType = z.infer<typeof RenameApiKeySchema>;
