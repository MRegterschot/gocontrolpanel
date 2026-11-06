import { z } from "zod";

export const SendEcmSchema = z.object({
  apiKey: z
    .string()
    .trim()
    .refine(
      (key) => !key || /^[^_\s]+_[^_\s]+$/.test(key),
      "Enter an ECM API key in matchId_token format",
    ),
  roundNumber: z.number().int().positive(),
});

export const SendEcmRecordsSchema = SendEcmSchema.extend({
  recordIds: z.array(z.string().min(1)).min(1, "Select at least one record"),
});
