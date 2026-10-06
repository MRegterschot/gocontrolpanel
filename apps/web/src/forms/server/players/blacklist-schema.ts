import { z } from "zod";

export const blacklistSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
});

export type BlacklistSchemaType = z.infer<typeof blacklistSchema>;
